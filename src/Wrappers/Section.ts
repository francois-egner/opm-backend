import { Types } from "../Types"
import { connection as conn, sectionQueries } from "../Sql"
import { checkForUndefined, ExceptionType } from "../Utils/Shared"
import { Exception } from "../Utils/Exception"
import HttpStatus from 'http-status-codes'
import {Element} from "./Element"


export class Section{

    private _id: number

    private _name: string

    private _pos_index: number

    private _entry_id: number

    constructor(id: number, name: string, pos_index: number, entry_id: number){
        this._id = id
        this._name = name
        this._pos_index = pos_index
        this._entry_id = entry_id
    }

    /**
    * Creates a new section and assigns it to the entry identified by provided unique identifier 
    * @param name Name of new section
    * @param pos_index Position (index) of section inside an entry
    * @param entry_id Unique identifier of entry the section is assigned to
    */
    static async create({name, pos_index, entry_id, connection=conn } : Types.Section.Params.create): Promise<Section>{
        //TODO: Check entry_id for validation? Not necessary if section is added by a member function of Entry?
        //TODO: Proper param validation
        if (!checkForUndefined({name, pos_index, entry_id})) throw new Exception("Failed to create new section. At least one argument is undefined!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        try{
            const queryData = [name, pos_index, entry_id]
            const sectionData = await connection.one(sectionQueries.create, queryData)

            return new Section(sectionData.id, sectionData.name, sectionData.pos_index, sectionData.entry_id)
        }
        catch(err: unknown){
            throw new Exception("Failed to create new Section!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }

    }

    /**
    * Checks if a section with provided unique identifier does exist 
    * id Unique identifier of section to check existence for
    */
    static async exists({id} : Types.Section.Params.exists): Promise<boolean>{
        
        try{
            const existsData = await conn.one(sectionQueries.exists, [id]);
            return existsData.exists;
        }catch(err: unknown){
            throw new Exception("Failed to check for existence!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    /**
     * Finds/Returns an instance of the section with provided unique identifier
     * @param id Unique identifier of section to be returned/found
     * @returns Section instance or null if no section was found
     */
    static async findById({id}: Types.Section.Params.findById): Promise<Section | null>{
        const exists = await this.exists({id: id})
        if(!exists) return null

        try{
            const sectionData = await conn.one(sectionQueries.findById, [id])
            return new Section(sectionData.id, sectionData.name, sectionData.pos_index, sectionData.entry_id)
        }catch(err: unknown){
            throw new Exception("Failed to find section!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    /**
     * Fetches all elements associated to section identified by provided unique identifier
     * @param id Unique identifier of section elements should be returned from
     * @param flat If true, only unique identifiers of elements will be returned 
     * @returns Array of Element instances, unique identifiers or null if no element was found
     */
    static async getElements({id, flat=true} : Types.Section.Params.getElements): Promise<Element[] | number[] | null>{
        const exists = await this.exists({id: id})
        if(!exists) throw new Exception("Failed to find section!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
        
        try{
            const elements: Element[] | number[] = []
            const elementsData = await conn.manyOrNone(flat ? sectionQueries.getElementsFlat: sectionQueries.getElements, [id])
            
            if(elementsData == null) return null

            for(const elementData of elementsData){
                const newElement = flat ? elementData.id : new Element(elementData.id, elementData.name, elementData.value, elementData.type, elementData.pos_index, elementData.section_id)
                elements.push(newElement)
            }

            return elements
        }catch(err: unknown){
            throw new Exception("Failed to fetch all element of section!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }


    /**
     * Deletes section and all of its elements
     * @param id Unique identifier of section to be deleted
     * @param transaction Transaction for querying
     */
    static async deleteById({id, transaction}: Types.Section.Params.deleteById) : Promise<void>{
        const exists = await this.exists({id: id})
        if (!exists) throw new Exception("Failed to delete section. No section with provided id exists!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        
        try{
            //Atomicity needs to be guaranteed, therefore we must use transactions from now on
            //Start a new transaction if no transaction was provided
            await conn.tx(async (tx)=>{
                if(!transaction) transaction = tx
                
                const elements_id = await this.getElements({id: id}) as number[]
                for(const element_id of elements_id) await Element.deleteById({id: element_id, connection:transaction})

                await transaction!.none(sectionQueries.deleteById, [id])
                
            })
        }catch(err: unknown){
            throw new Exception("Failed to delete section!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }


    //#region Getters & Setters
    get id(): number{
        return this._id
    }

    set id( id: number){
        this._id = id
    }

    get title(): string{
        return this._name
    }
    
    set title(title: string){
        this._name = title
    }

    get pos_index(): number{
        return this._pos_index
    }

    set pos_index(pos_index: number){
        this._pos_index = pos_index
    }

    get entry_id(): number{
        return this._entry_id
    }

    set entry_id(entry_id: number){
        this._entry_id = entry_id
    }
    //#endregion
}