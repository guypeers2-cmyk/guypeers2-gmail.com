// Runner voor de pariteitstest: leest projecten (JSON) van stdin en
// schrijft de berekende offertes naar stdout.
import { berekenOfferte } from "../../web/engine.js";

let invoer = "";
for await (const chunk of process.stdin) invoer += chunk;
const projecten = JSON.parse(invoer || "[]");
const uitvoer = projecten.map((project) => berekenOfferte(project));
process.stdout.write(JSON.stringify(uitvoer));
