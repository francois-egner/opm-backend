import { QueryFile } from "pg-promise"
import { join as joinPath} from 'path'

function readSQL(file: string): QueryFile {
    const fullPath: string = joinPath(__dirname, file);
    const queryFile: QueryFile = new QueryFile(fullPath, {minify: true, debug: true});

    return queryFile;
}

export const user_reset= readSQL("/User/reset.sql")
