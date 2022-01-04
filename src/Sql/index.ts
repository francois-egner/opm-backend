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
    create: loadSQL("/User/create.sql")
}

export const sectionQueries = {
    create: loadSQL("/Section/create.sql"),
    exists: loadSQL("/Section/exists.sql"),
    findById: loadSQL("/Section/findById.sql"),
    getElements: loadSQL("/Section/getElements.sql"),
    getElementsFlat: loadSQL("/Section/getElementsFlat.sql"),
    deleteById: loadSQL("/Section/deleteById.sql"),
    setProperty: loadSQL("/Section/setProperty.sql", true)
}

export const elementQueries = {
    create: loadSQL("/Element/create.sql"),
    findById: loadSQL("/Element/findById.sql"),
    exists: loadSQL("/Element/exists.sql"),
    deleteById: loadSQL("/Element/deleteById.sql"),
    setPosition: loadSQL("/Element/setPosition.sql"),
    setSection: loadSQL("/Element/setSection.sql"),
    setName: loadSQL("/Element/setName.sql"),
    setValue: loadSQL("/Element/setValue.sql"),
    setType: loadSQL("/Element/setType.sql"),
    setProperty: loadSQL("/Element/setProperty.sql", true)
}

export const entryQueries = {
    create: loadSQL("/Entry/create.sql"),
    exists: loadSQL("/Entry/exists.sql"),
    deleteById: loadSQL("/Entry/deleteById.sql"),
    findById: loadSQL("/Entry/findById.sql"),
    getSections: loadSQL("/Entry/getSections.sql"),
    setProperty: loadSQL("/Entry/setProperty.sql", true)
}

export const groupQueries = {
    create: loadSQL("/Group/create.sql"),
    exists: loadSQL("/Group/exists.sql"),
    getSubGroups: loadSQL("/Group/getSubGroups.sql"),
    getEntries: loadSQL("/Group/getEntries.sql"),
    findById: loadSQL("/Group/findById.sql"),
    deleteById: loadSQL("/Group/deleteById.sql"),
    setProperty: loadSQL("/Group/setProperty.sql", true)
}

/**
 * Reads in an SQL file
 * @param file Relative path to SQL file
 * @returns 
 */
function loadSQL(file: string, plain?: boolean): QueryFile | string {
    const fullPath: string = joinPath(__dirname, file);
    console.log(fullPath)
    if(plain){
        return pgMinify(readFileSync(fullPath,`utf8`),{compress: true, removeAll:true})
    }
    const queryFile: QueryFile = new QueryFile(fullPath, {minify: true, debug: true});

    return queryFile;
}

