import express from "express"
import {connection} from "../../db";
import {User} from "../Wrappers/User";
import {logger} from "../Utils/Logger";
import HttpStatus from 'http-status-codes'
import {Group} from "../Wrappers/Group";
import {NULL} from "../Utils/Shared";

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

groupRouter.delete("/:id", async (req, res)=>{
    try{
        await connection.tx(async (session)=>{
            const group_id = Number(req.params.id)
            const group = await Group.findById(group_id, NULL, NULL, session)
            if(group == null)
                return res.status(HttpStatus.NOT_FOUND).send()
            
            const owner_id = await Group.getOwner(group_id, NULL, session)
            if(owner_id !== req.auth.id)
                return res.status(HttpStatus.FORBIDDEN).send()
            
            const root_id = await User.getProperty(req.auth.id, ["root_id"], session)
            
            if(root_id === group_id)
                return res.status(HttpStatus.FORBIDDEN).send()
            
            await Group.deleteById(group_id,session)
            
            res.status(HttpStatus.OK).send()
        })
    }catch(err: unknown){
        logger.error(JSON.stringify(err))
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send()
    }
})

