import pgPromise, { IDatabase } from "pg-promise"
import { types } from "pg"
import { join as joinPath} from 'path'
import { readFileSync } from "fs"
import pgMinify from "pg-minify"
import { configuration } from "../src/Utils/Configurator"
import { Exception } from "../src/Utils/Exception"

export let connection: IDatabase<any>
let connected = false

export async function connect(): Promise<void>{

    const pg = pgPromise();

    //Add INT8 support
    types.setTypeParser(types.builtins.INT8, (value: string) => {
        return parseInt(value);
    });

    const db = await pg({
        user: configuration.postgresql.username,
        host: configuration.postgresql.host,
        database: configuration.postgresql.database,
        password: configuration.postgresql.password,
        keepAlive: configuration.postgresql.keepAlive,
        max: 10
        
    });
  
    connected = true
    connection = db
}

export async function disconnect(): Promise<void>{
    if(connected){
        connection.$pool.end()
        connected = false
    }
}

export const userQueries = {
    create: loadSQL("/User/create.sql"),
    findById: loadSQL("/User/findById.sql"),
    checkEmailExistence: loadSQL("/User/checkEmailExistence.sql"),
    checkUsernamExistence: loadSQL("/User/checkUsernameExistence.sql"),
    exists: loadSQL("/User/exists.sql"),
    setProperty: loadSQL("/User/setProperty.sql")
}

export const sectionQueries = {
    create: loadSQL("/Section/create.sql"),
    exists: loadSQL("/Section/exists.sql"),
    findById: loadSQL("/Section/findById.sql"),
    getElements: loadSQL("/Section/getElements.sql"),
    getElementsFlat: loadSQL("/Section/getElementsFlat.sql"),
    deleteById: loadSQL("/Section/deleteById.sql"),
    setProperty: loadSQL("/Section/setProperty.sql")
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
    setProperty: loadSQL("/Element/setProperty.sql")
}

export const entryQueries = {
    create: loadSQL("/Entry/create.sql"),
    exists: loadSQL("/Entry/exists.sql"),
    deleteById: loadSQL("/Entry/deleteById.sql"),
    findById: loadSQL("/Entry/findById.sql"),
    getSections: loadSQL("/Entry/getSections.sql"),
    setProperty: loadSQL("/Entry/setProperty.sql")
}

export const groupQueries = {
    create: loadSQL("/Group/create.sql"),
    exists: loadSQL("/Group/exists.sql"),
    getSubGroups: loadSQL("/Group/getSubGroups.sql"),
    getEntries: loadSQL("/Group/getEntries.sql"),
    findById: loadSQL("/Group/findById.sql"),
    deleteById: loadSQL("/Group/deleteById.sql"),
    setProperty: loadSQL("/Group/setProperty.sql"),
    getOwner: loadSQL("/Group/getOwner.sql")
}



function loadSQL(file: string): string {
    try{
        const fullPath: string = joinPath(configuration.general.sqlPath, file)
        return pgMinify(readFileSync(fullPath,`utf8`),{compress: true, removeAll:true})
    }catch(err: unknown){
        throw new Exception("Failed to load sql file!", Types.ExceptionType.RuntimeError, undefined, err as Error)
    }
    
    
}

