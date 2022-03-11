
import { loadConfiguration } from "./Utils/Configurator";
import {logger} from './Utils/Logger';
import {connect, disconnect} from '../db'
import { Exception } from "./Utils/Exception";
import express from "express";
import { configuration } from "./Utils/Configurator"
import { auth, authRouter } from "./Routes/Auth"
import { groupRouter } from "./Routes/Group"
import { userRouter } from "./Routes/User"

const server = express()

const unless = function(middleware, ...paths) {
    return function(req, res, next) {
      const pathCheck = paths.some(path => path === req.path);
      pathCheck ? next() : middleware(req, res, next);
    };
};

const main = async ()=>{
    
    try{
        loadConfiguration()
        
        await connect()

        
        // await User.create({email: "mail@francois-egner.de", username: "cryptn", password_hash: "ttt", role: Types.User.Role.normal,
        //                    display_name: "Crypt0n", forename: "Francois", surname: "Egner"})
        server.use(express.json());
        // server.use(compression({
        //     level: 6,
        //     threshold:0
        // }))
        server.use(unless(auth, "/auth/login", "/auth/register"))
        
        server.use("/auth", authRouter)
        server.use("/group", groupRouter)
        server.use("/user", userRouter)
        
        
        server.listen(configuration.express.port,()=>{
            console.log("Server started!")
        })
        
    }catch(ex: any){
        logger.error((ex as Exception).toString())
        await disconnect()
    }
    

}


main();
