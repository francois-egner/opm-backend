
import { loadConfiguration } from "./Utils/Configurator";
import {logger} from './Utils/Logger';
import {connect, connection, disconnect} from '../db'
import { Exception } from "./Utils/Exception";
import { configuration } from "./Utils/Configurator"
import { auth, authRouter } from "./Routes/Auth"
import express, { NextFunction, Request, Response } from 'express';
import {userRouter} from "./Routes/User";
import {groupRouter} from "./Routes/Group";

export const server = express()

const unless = function(middleware, ...paths) {
    return function(req, res, next) {
      const pathCheck = paths.some(path => path === req.path);
      pathCheck ? next() : middleware(req, res, next);
    };
}

export interface CustomRequest extends Request {
    auth:{
        id: number
    } 
}

const main = async ()=>{
    try{
        loadConfiguration()
        
        await connect()

        server.use(express.json())
        server.use(unless(auth, "/auth/login/", "/auth/register/"))
        server.use("/auth", authRouter)
        server.use("/users", userRouter)
        server.use("/groups", groupRouter)
        
        server.listen(configuration.express.port,()=>{
            console.log("Server started!")
        })
        
    }catch(ex: any){
        logger.error((ex as Exception).toString())
        await disconnect()
    }
    

}


main();
