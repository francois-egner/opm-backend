
import { PrismaClient } from '@prisma/client'


export let connection:  PrismaClient<any>
let connected = false

export async function connect(): Promise<void>{

    const prisma = new PrismaClient()

    connected = true
    connection = prisma
}

export async function disconnect(): Promise<void>{
    if(connected){
        await connection.$disconnect()
        connected = false
    }
}

