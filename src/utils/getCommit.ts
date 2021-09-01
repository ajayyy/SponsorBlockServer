import { execSync } from "child_process";
const gitCommand = "git rev-parse HEAD";

export const getCommit = ():string => execSync(gitCommand).toString().trim();