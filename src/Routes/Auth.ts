import express from "express";
import { sign, verify } from 'jsonwebtoken';
import { connection } from "../../db";
import { User } from "../Wrappers/User";
import { configuration } from "../Utils/Configurator"
import HttpStatus from 'http-status-codes'
import jwt from "express-jwt"  


export const authRouter = express.Router()

export async function auth(request: express.Request, response: express.Response, next) {
    const bearer_header = request.headers.authorization
    
    if(bearer_header === undefined || !bearer_header.startsWith("Bearer "))
        return response.status(401).send()

    
    const jwt = bearer_header.substring(7, bearer_header.length)
    
    
    try{
        const decoded_jwt:any = verify(jwt, configuration.express.jwt_secret)
        request.auth = {id: decoded_jwt.id}
    }catch(err: unknown){
        return response.status(HttpStatus.UNAUTHORIZED).send()
    }

    const role = await User.getRole({id: request.auth.id})

    //TODO: Role permission matrix
    
    next();
  }

authRouter.put('/login', async (req, res)=>{
    try{
        await connection.task(async (task)=>{
            
            const email = req.body.email
            const password_hash = req.body.password_hash

            const user = await User.findByEmail({email: email, password_hash: password_hash, connection: task})
            
            if(user == null)
                return res.status(HttpStatus.NOT_FOUND).send()
            
            
            const jwt = sign({id: user.id, exp: Math.floor(Date.now() / 1000) + configuration.express.jwt_expiration_time * 60}, 
                              configuration.express.jwt_secret)
            
            res.json({jwt: jwt})
            
        })
    }catch(err: unknown){
        console.log(err)
    }
    
})

authRouter.get("/", (req, res)=>{

    console.log(req.auth)
    res.send("Erfolgreich!")
})


