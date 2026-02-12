use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BibEntry {
    pub key: String,
    pub entry_type: String,
    pub author: String,
    pub title: String,
    pub year: u32,
    pub journal: Option<String>,
    pub publisher: Option<String>,
    pub volume: Option<String>,
    pub pages: Option<String>,
    pub doi: Option<String>,
    pub url: Option<String>,
    pub isbn: Option<String>,
    pub booktitle: Option<String>,
}

// CrossRef API response types
#[derive(Deserialize)]
struct CrossRefResponse {
    message: CrossRefMessage,
}

#[derive(Deserialize)]
struct CrossRefMessage {
    title: Option<Vec<String>>,
    author: Option<Vec<CrossRefAuthor>>,
    #[serde(rename = "container-title")]
    container_title: Option<Vec<String>>,
    #[serde(rename = "published-print")]
    published_print: Option<CrossRefDate>,
    #[serde(rename = "published-online")]
    published_online: Option<CrossRefDate>,
    volume: Option<String>,
    page: Option<String>,
    publisher: Option<String>,
    #[serde(rename = "DOI")]
    doi: Option<String>,
    #[serde(rename = "URL")]
    url: Option<String>,
    #[serde(rename = "type")]
    work_type: Option<String>,
}

#[derive(Deserialize)]
struct CrossRefAuthor {
    given: Option<String>,
    family: Option<String>,
}

#[derive(Deserialize)]
struct CrossRefDate {
    #[serde(rename = "date-parts")]
    date_parts: Option<Vec<Vec<u32>>>,
}

// OpenLibrary response types
#[derive(Deserialize)]
struct OpenLibraryBook {
    title: Option<String>,
    authors: Option<Vec<OpenLibraryAuthor>>,
    publishers: Option<Vec<OpenLibraryPublisher>>,
    publish_date: Option<String>,
    url: Option<String>,
}

#[derive(Deserialize)]
struct OpenLibraryAuthor {
    name: Option<String>,
}

#[derive(Deserialize)]
struct OpenLibraryPublisher {
    name: Option<String>,
}

#[tauri::command]
pub fn read_bib_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read .bib file: {}", e))
}

#[tauri::command]
pub fn write_bib_file(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = std::path::PathBuf::from(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    fs::write(&path, content).map_err(|e| format!("Failed to write .bib file: {}", e))
}

#[tauri::command]
pub fn lookup_doi(doi: String) -> Result<BibEntry, String> {
    let url = format!("https://api.crossref.org/works/{}", doi);

    let client = reqwest::blocking::Client::builder()
        .user_agent("Lilia-Desktop/0.1.0 (mailto:contact@lilia.dev)")
        .build()
        .map_err(|e| format!("HTTP client error: {}", e))?;

    let response: CrossRefResponse = client
        .get(&url)
        .send()
        .map_err(|e| format!("CrossRef request failed: {}", e))?
        .json()
        .map_err(|e| format!("Failed to parse CrossRef response: {}", e))?;

    let msg = response.message;

    let title = msg
        .title
        .and_then(|t| t.into_iter().next())
        .unwrap_or_default();

    let author = msg
        .author
        .map(|authors| {
            authors
                .iter()
                .map(|a| {
                    let family = a.family.as_deref().unwrap_or("");
                    let given = a.given.as_deref().unwrap_or("");
                    if given.is_empty() {
                        family.to_string()
                    } else {
                        format!("{}, {}", family, given)
                    }
                })
                .collect::<Vec<_>>()
                .join(" and ")
        })
        .unwrap_or_default();

    let year = msg
        .published_print
        .or(msg.published_online)
        .and_then(|d| d.date_parts)
        .and_then(|parts| parts.into_iter().next())
        .and_then(|parts| parts.into_iter().next())
        .unwrap_or(0);

    let entry_type = match msg.work_type.as_deref() {
        Some("journal-article") => "article",
        Some("book") | Some("monograph") => "book",
        Some("proceedings-article") => "inproceedings",
        _ => "misc",
    };

    // Generate a citation key from first author's family name + year
    let key = {
        let family = author.split(',').next().unwrap_or("unknown").trim().to_lowercase();
        let clean: String = family.chars().filter(|c| c.is_alphanumeric()).collect();
        format!("{}{}", clean, year)
    };

    Ok(BibEntry {
        key,
        entry_type: entry_type.to_string(),
        author,
        title,
        year,
        journal: msg.container_title.and_then(|t| t.into_iter().next()),
        publisher: msg.publisher,
        volume: msg.volume,
        pages: msg.page,
        doi: msg.doi,
        url: msg.url,
        isbn: None,
        booktitle: None,
    })
}

#[tauri::command]
pub fn lookup_isbn(isbn: String) -> Result<BibEntry, String> {
    let clean_isbn: String = isbn.chars().filter(|c| c.is_alphanumeric()).collect();
    let url = format!(
        "https://openlibrary.org/api/books?bibkeys=ISBN:{}&format=json&jscmd=data",
        clean_isbn
    );

    let client = reqwest::blocking::Client::builder()
        .user_agent("Lilia-Desktop/0.1.0")
        .build()
        .map_err(|e| format!("HTTP client error: {}", e))?;

    let response: serde_json::Value = client
        .get(&url)
        .send()
        .map_err(|e| format!("OpenLibrary request failed: {}", e))?
        .json()
        .map_err(|e| format!("Failed to parse OpenLibrary response: {}", e))?;

    let bib_key = format!("ISBN:{}", clean_isbn);
    let book_data = response
        .get(&bib_key)
        .ok_or_else(|| format!("ISBN {} not found", clean_isbn))?;

    let book: OpenLibraryBook = serde_json::from_value(book_data.clone())
        .map_err(|e| format!("Failed to parse book data: {}", e))?;

    let title = book.title.unwrap_or_default();
    let author = book
        .authors
        .map(|a| {
            a.iter()
                .filter_map(|a| a.name.clone())
                .collect::<Vec<_>>()
                .join(" and ")
        })
        .unwrap_or_default();

    let publisher = book.publishers.and_then(|p| p.into_iter().next()).and_then(|p| p.name);

    // Try to extract year from publish_date
    let year = book
        .publish_date
        .and_then(|d| {
            d.chars()
                .filter(|c| c.is_ascii_digit())
                .collect::<String>()
                .get(..4)
                .and_then(|y| y.parse::<u32>().ok())
        })
        .unwrap_or(0);

    let key = {
        let family = author
            .split_whitespace()
            .last()
            .unwrap_or("unknown")
            .to_lowercase();
        let clean: String = family.chars().filter(|c| c.is_alphanumeric()).collect();
        format!("{}{}", clean, year)
    };

    Ok(BibEntry {
        key,
        entry_type: "book".to_string(),
        author,
        title,
        year,
        journal: None,
        publisher,
        volume: None,
        pages: None,
        doi: None,
        url: book.url,
        isbn: Some(clean_isbn),
        booktitle: None,
    })
}
