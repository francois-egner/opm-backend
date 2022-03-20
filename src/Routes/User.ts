import express from "express"
import {connection} from "../../db";
import {User} from "../Wrappers/User";
import {logger} from "../Utils/Logger";
import HttpStatus from 'http-status-codes'
import {CustomRequest} from "../index";
import {use} from "chai";

export const userRouter = express.Router()

//Receive all private user data (own)
userRouter.get("/", async (req: CustomRequest, res)=>{
    
    try{
        await connection.$transaction(async (session) => {
            const user_data = await User.findById(req.auth.id, session)
            res.json(user_data).send()
        })
    }catch(err: unknown){
        console.log(err)
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send()
    }
})