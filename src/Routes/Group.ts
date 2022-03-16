import express from "express"
import {connection} from "../../db";
import {User} from "../Wrappers/User";
import {logger} from "../Utils/Logger";
import HttpStatus from 'http-status-codes'
import {Group} from "../Wrappers/Group";

export const groupRouter = express.Router()

groupRouter.put("/", async (req, res)=>{
    try{
        await connection.tx(async (session)=>{
            const name = req.body.name
            const icon = req.body.icon
            const supergroup_id = req.body.supergroup_id
            const pos_index = req.body.pos_index
            const root = req.body.root
            
            const group = await Group.create(name, icon, supergroup_id, pos_index, root, session)
            res.json(group).status(HttpStatus.CREATED).send()
        })
    }catch(err: unknown){
        console.log(err)
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send()
    }
})

groupRouter.get("/", async (req, res)=>{
    try{
        await connection.task(async (session)=>{
            const root_id = await User.getProperty(req.auth.id, ["root_id"], session)
            const groups = await Group.findById(root_id, -1, true, session)
            res.json(groups).send()
        })
    }catch(err: unknown){
        console.log(err)
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send()
    }
})