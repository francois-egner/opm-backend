import pgPromise, { IDatabase } from "pg-promise";
import { Types } from "././Types";
import { User } from "./Wrappers/User";
import {logger} from './Utils/Logger';
import {connect, disconnect, sectionQueries} from './Sql'
import {Section} from './Wrappers/Section'
import {Element} from './Wrappers/Element'
import { Entry } from "./Wrappers/Entry";
import { Exception } from "./Utils/Exception";
import { Group } from "./Wrappers/Group";

const main = async ()=>{
    try{
        await connect()
        
        const g1 = await Group.create({name:"Group1"})
        await Group.setProperty({id:g1.id, property_name: "owner_id", new_value:99})

        const g2 = await Group.create({name: "Group2"})
        await Group.addGroup({id: g1.id, group: g2})

        const g3 = await Group.create({name:"Group3"})
        const g4 = await Group.create({name:"Group4"})

        console.table(await Group.getUnassignedGroups({}))

        await disconnect()
        //     for(let index = 0; index < 5; index++){
        //         const g11 = await Group.create({name:`Group${index}`, supergroup_id: g1.id})
        //         groups.push(g11)
        //         const g21 = await Group.create({name: `Group${index}${index}`, supergroup_id: g11.id})
        //         await Group.create({name: `Group${index}${index}tttt`, supergroup_id: g21.id})
        //         await Group.create({name: `Group${index}${index}tttt`, supergroup_id: g21.id})
        //         const t = await Entry.create({title: `Title${index}`, tags:[]})
        //         await Entry.setProperty({id: t.id, property_name: "category_id", new_value:g11.id})
        //     }
                
            
        //     console.log(JSON.stringify(await Group.findById({id: g1.id}), null, 4))
        //     await Group.deleteById({id: g1.id})
        //    // const en2 = await Entry.create({title:"Entry2", tags:["technik2","server2"], pos_index: 1, category_id: 0})
            
        //     // const sections: Section[] = []
        //     // const sections2: Section[] = []
        //     // for (let i = 0; i < 10; i++){
        //     //     const s = await Section.create({name: `S${i}`, pos_index: 0})
        //     //     const s2 = await Section.create({name: `S2${i}`, pos_index: 0})
        //     //     await Entry.addSection({id: en.id, section: s})
        //     //     await Entry.addSection({id: en2.id, section: s2})
        //     //     sections.push(s)
        //     //     sections2.push(s2)
        //     // }
    
            
        //     // const s = await Section.create({name: `LEL`, pos_index: 4})
        //     // await Entry.addSection({id: en.id, section: s, pos_index: 4})
        //     // console.table(await Entry.getSections({id: en.id, flat: false}))
        //     // console.table(await Entry.getSections({id: en2.id, flat: false}))
    
        //     // await Entry.moveSection({id: en.id, section_id: s.id, new_entry_id: en.id, new_pos:8})
    
        //     // console.table(await Entry.getSections({id: en.id, flat: false}))
        //     // console.table(await Entry.getSections({id: en2.id, flat: false}))
        
        
        
    }catch(ex: any){
        logger.error((ex as Exception).toString())
        await disconnect()
    }
    

}
main();
