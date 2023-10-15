import {CSS, ELEM} from "htmlgen";
import {App} from "./app";

CSS.add(`
body{
    font-family:Arial;
}
`);

CSS.init();

const app = new App(document.body);

console.log("main initialized");
