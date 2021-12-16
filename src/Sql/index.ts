import pgPromise, { IDatabase, QueryFile } from "pg-promise"
import { join as joinPath} from 'path'
import {Types} from "../Types"
import { logger } from "../Utils/Logger"

export let connection: IDatabase<any>

export async function connect(): Promise<void>{
    const pg = pgPromise();
    const db = await pg({
        user: "crypt0n",
        host: "localhost",
        database:"postgres",
        password:"",
        keepAlive:true
    });

    connection = db
}

export async function disconnect(): Promise<void>{
    connection.$pool.end()
}

export const userQueries = {
    create: readSQL("/User/create.sql")
}

export const elementQueries = {
    create: readSQL("/Element/create.sql")
}

/**
 * Reads in an SQL file
 * @param file Relative path to SQL file
 * @returns 
 */
function readSQL(file: string): QueryFile {
    const fullPath: string = joinPath(__dirname, file);
    const queryFile: QueryFile = new QueryFile(fullPath, {minify: true, debug: true});

    return queryFile;
}

