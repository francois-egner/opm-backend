import express from "express";
import { sign, verify } from 'jsonwebtoken';
import { connection } from "../../db";
import { User } from "../Wrappers/User";
import { configuration } from "../Utils/Configurator"
import HttpStatus from 'http-status-codes'  
import { checkForUndefined, hasNumber, isNumeric } from "../Utils/Shared";
import { Exception } from "../Utils/Exception";


export const authRouter = express.Router()

const privMatrix = {
    "/group/" : {roles:[Types.User.Role.admin, Types.User.Role.normal], methods:["PUT","GET"]},
    "/group/:id" : {roles:[Types.User.Role.admin, Types.User.Role.normal], methods:["DELETEs"]},
}

export async function auth(request: express.Request, response: express.Response, next) {
    const bearer_header = request.headers.authorization
    
    if(bearer_header === undefined || !bearer_header.startsWith("Bearer "))
        return response.status(401).send()

    
    const jwt = bearer_header.substring(7, bearer_header.length)
    
    //Check for valid jwt
    try{
        const decoded_jwt:any = verify(jwt, configuration.express.jwt_secret)
        request.auth = {id: decoded_jwt.id}
    }catch(err: unknown){
        return response.status(HttpStatus.UNAUTHORIZED).send()
    }

    //Check if user is enbaled
    const user_enabled = await User.getProperty({id: request.auth.id, property_name:"enabled"})
    if(!user_enabled)
        return response.status(HttpStatus.UNAUTHORIZED).send()

    //Check if role is allowed to use used route
    const role = await User.getRole({id: request.auth.id})
    const requestPath = request.path.replace(/\/\d+/g, "/:id")
    
    //If still a number in requestPath, the id contained a non numeric character
    if(hasNumber(requestPath))
        return response.status(HttpStatus.BAD_REQUEST).send()

    //Check if user role may use the taken route
    if(!privMatrix[requestPath].roles.includes(role))
        return response.status(HttpStatus.UNAUTHORIZED).send()
    
    
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

authRouter.put('/register', async(req, res)=>{
    
    try{
        const new_user = await connection.tx(async (tx)=>{
            const userData: Params.User.create = {
                email: req.body.email,
                password_hash: req.body.password_hash,
                username: req.body.username,
                forename: req.body.forename,
                surname: req.body.surname,
                display_name: req.body.display_name,
                transaction: tx
            }
        
            if(!checkForUndefined(userData))
                return res.status(HttpStatus.BAD_REQUEST).send()
            
            return await User.create(userData)
        })

        res.json(new_user).status(HttpStatus.CREATED)
    }catch(err: unknown){
        if (err instanceof Exception)
            return res.status((err as Exception).responseStatus).send()
    }
    
})


