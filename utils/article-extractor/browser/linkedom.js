import { JSDOM } from 'jsdom';
console.log("Importing JSDOM");
export const DOMParser = new JSDOM().window.DOMParser;
