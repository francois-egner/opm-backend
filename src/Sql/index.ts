import pgPromise, { IDatabase, QueryFile } from "pg-promise"
import { join as joinPath} from 'path'
import {readFileSync} from "fs"
import pgMinify from "pg-minify"

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

export const sectionQueries = {
    create: readSQL("/Section/create.sql"),
    exists: readSQL("/Section/exists.sql"),
    findById: readSQL("/Section/findById.sql"),
    getElements: readSQL("/Section/getElements.sql"),
    getElementsFlat: readSQL("/Section/getElementsFlat.sql"),
    deleteById: readSQL("/Section/deleteById.sql"),
    setProperty: readSQL("/Section/setProperty.sql", true)
}

export const elementQueries = {
    create: readSQL("/Element/create.sql"),
    findById: readSQL("/Element/findById.sql"),
    exists: readSQL("/Element/exists.sql"),
    deleteById: readSQL("/Element/deleteById.sql"),
    setPosition: readSQL("/Element/setPosition.sql"),
    setSection: readSQL("/Element/setSection.sql"),
    setName: readSQL("/Element/setName.sql"),
    setValue: readSQL("/Element/setValue.sql"),
    setType: readSQL("/Element/setType.sql"),
    setProperty: readSQL("/Element/setProperty.sql", true)
}

export const entryQueries = {
    create: readSQL("/Entry/create.sql"),
    exists: readSQL("/Entry/exists.sql"),
    deleteById: readSQL("/Entry/deleteById.sql"),
    findById: readSQL("/Entry/findById.sql"),
    getSections: readSQL("/Entry/getSections.sql"),
    setProperty: readSQL("/Entry/setProperty.sql", true)
}

export const groupQueries = {
    create: readSQL("/Group/create.sql"),
    exists: readSQL("/Group/exists.sql"),
    getSubGroups: readSQL("/Group/getSubGroups.sql"),
    getEntries: readSQL("/Group/getEntries.sql"),
    findById: readSQL("/Group/findById.sql"),
    deleteById: readSQL("/Group/deleteById.sql"),
    setProperty: readSQL("/Group/setProperty.sql", true)
}

/**
 * Reads in an SQL file
 * @param file Relative path to SQL file
 * @returns 
 */
function readSQL(file: string, plain?: boolean): QueryFile | string {
    const fullPath: string = joinPath(__dirname, file);
    console.log(fullPath)
    if(plain){
        return pgMinify(readFileSync(fullPath,`utf8`),{compress: true, removeAll:true})
    }
    const queryFile: QueryFile = new QueryFile(fullPath, {minify: true, debug: true});

    return queryFile;
}

