import { QueryFile } from "pg-promise"
import { join as joinPath} from 'path'

function readSQL(file: string): string {
    const fullPath: string = joinPath(__dirname, file);
    const queryFile: QueryFile = new QueryFile(fullPath, {minify: true, debug: true});
    console.log(queryFile.toString())
    return queryFile.toString();
}

export const user_reset= readSQL("/User/reset.sql")
