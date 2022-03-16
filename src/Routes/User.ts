import express from "express"
import {connection} from "../../db";
import {User} from "../Wrappers/User";
import {logger} from "../Utils/Logger";
import HttpStatus from 'http-status-codes'

export const userRouter = express.Router()

//Receive all private user data (own)
userRouter.get("/", async (req, res)=>{
    try{
        await connection.task(async (session) => {
            const user_data = await User.getOwn(req.auth.id, session)
            res.json(user_data).send()
        })
    }catch(err: unknown){
        console.log(err)
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send()
    }
})