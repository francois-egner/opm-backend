import express from "express"
import {connection} from "../../db"
import { Group } from "../Wrappers/Group"
import { User } from "../Wrappers/User"
import HttpStatus from 'http-status-codes'  

export const groupRouter = express.Router()

//Add new group
groupRouter.put("/", async (req, res)=>{
    try{
        const new_group = await connection.tx(async(tx)=>{
            const groupData: Params.Group.create = {
                name: req.body.name,
                icon: req.body.icon,
                pos_index: req.body.pos_index,
                supergroup_id: req.body.supergroup_id === undefined 
                               ? await User.getProperty({id: req.auth.id, property_name:"root_id", connection: tx}) 
                               : req.body.supergroup_id,
                transaction: tx
                
            }
    
            const new_group = await Group.create(groupData)
            return new_group
        })

        return res.status(HttpStatus.CREATED).json(new_group)
    }catch(err: unknown){
        console.log(err)
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send()
    }
    
})

//Get all data
groupRouter.get("/", async (req, res)=>{
    const data = await connection.task(async (task)=>{
        const root_id = await User.getProperty({id: req.auth.id, property_name: "root_id", connection: task})
        return await Group.findById({id: root_id, full: true,connection: task})
    })
    
    res.json(data)
})