import express from "express";
import { sign, verify } from 'jsonwebtoken';
import { connection } from "../../db";
import { User } from "../Wrappers/User";
import { configuration } from "../Utils/Configurator"
import HttpStatus from 'http-status-codes'  
import { hasNumber, NULL} from "../Utils/Shared";
import { Exception } from "../Utils/Exception";


export const authRouter = express.Router()

const privMatrix = {
    "/group/" : {roles:[Types.User.Role.admin, Types.User.Role.normal], methods:["PUT","GET"]},
    "/group/:id" : {roles:[Types.User.Role.admin, Types.User.Role.normal], methods:["DELETE"]},
    "/group/move/:id" : {roles:[Types.User.Role.admin, Types.User.Role.normal], methods:["PATCH"]},
    "/group/entries/:id" : {roles:[Types.User.Role.admin, Types.User.Role.normal], methods:["GET"]},
    "/user/data/" : {roles:[Types.User.Role.admin, Types.User.Role.normal], methods:["GET"]},
    "/user/" : {roles:[Types.User.Role.admin, Types.User.Role.normal], methods:["DELETE"]}
}

export async function auth(request: express.Request, response: express.Response, next) {
    
        const bearer_header = request.headers.authorization

        if(bearer_header === undefined || !bearer_header.startsWith("Bearer "))
            return response.status(401).send()


        const jwt = bearer_header.substring(7, bearer_header.length)

        //Check for valid jwt
        try{
            const decoded_jwt:any = verify(jwt, configuration.express.jwt_secret)
            request.auth = {id: decoded_jwt.m_id}
        }catch(err: unknown){
            return response.status(HttpStatus.UNAUTHORIZED).send()
        }

        //Check if user is enbaled
        const user_enabled = await User.getProperty(request.auth.id,["enabled"],request.session)
        if(!user_enabled)
            return response.status(HttpStatus.UNAUTHORIZED).send()

        //Check if role is allowed to use used route
        const role = await User.getRole(request.auth.id, request.session)
        const requestPath = request.path.replace(/\/\d+/g, "/:id")

        //If still a number in requestPath, the id contained a non numeric character
        if(hasNumber(requestPath))
            return response.status(HttpStatus.BAD_REQUEST).send()

        //Check if user role may use the taken route
        if(!privMatrix[requestPath].roles.includes(role))
            return response.status(HttpStatus.UNAUTHORIZED).send()


        next(request,response, next, request.session)
        console.log("End!")
    
    
    
}

authRouter.put('/login/', async (req, res)=>{
    try{
        await connection.task(async (session)=>{
            
            const email = req.body.email
            const password_hash = req.body.password_hash

            const user = await User.findByEmail(email,password_hash, session)
            
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

authRouter.put('/register/', async(req, res)=>{
     try{
         
         
         const new_user = await connection.tx(async (session)=>{
            
             const email =  req.body.email
             const password_hash = req.body.password_hash
             const role = Types.User.Role.normal
             const username = req.body.username
             const forename =  req.body.forename
             const surname = req.body.surname
             const display_name = req.body.display_name
             const profile_picture = req.body.profile_picture
            
            
             return await User.create(email, username, password_hash, role, forename, surname, display_name, NULL, profile_picture, session)
         }) 
        

        res.status(HttpStatus.CREATED).json(new_user)
    }catch(err: unknown){
         console.log(err)
        if (err instanceof Exception)
            return res.status((err as Exception).responseStatus).send()
    }
    
})


