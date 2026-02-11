declare module "nspell" {
  interface NSpellInstance {
    correct(word: string): boolean;
    suggest(word: string): string[];
    spell(word: string): { correct: boolean };
    add(word: string, model?: string): this;
    remove(word: string): this;
    wordCharacters(): string | null;
    dictionary(dic: string | Buffer): this;
    personal(dic: string | Buffer): this;
  }

  function NSpell(aff: string | Buffer, dic: string | Buffer): NSpellInstance;

  export default NSpell;
}
