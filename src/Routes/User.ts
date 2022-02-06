import express from "express"
import {connection} from "../../db"
import { Group } from "../Wrappers/Group"
import { User } from "../Wrappers/User"
import HttpStatus from 'http-status-codes'  
import { Exception } from "../Utils/Exception"
import { configuration as config } from "../Utils/Configurator"
import { isSupportImage, isValidB64 } from "../Utils/Shared"

export const userRouter = express.Router()


userRouter.get("/data/", async (req, res)=>{
    const user_id = req.auth.id
    await connection.task(async (task)=>{
        const data = await User.getAllData({id: user_id, connection: task })
        
        return res.json(data)
    })
})

userRouter.delete("/",async (req, res)=>{
    try{

        await connection.tx(async (tx)=>{
        
            await User.deleteById({id: req.auth.id, transaction: tx})
            res.status(HttpStatus.OK).send()
        })
    }catch(err: unknown){
        if(err instanceof Exception)
            return res.status(err.responseStatus).send()

        console.log(err)
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send()
    }
    
    
})