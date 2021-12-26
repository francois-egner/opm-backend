import { Types } from "../Types"
import { elementQueries } from "../Sql/index"
import { Exception } from "../Utils/Exception"
import HttpStatus from 'http-status-codes'
import { connection as conn } from "../Sql"
import { Section } from "../Wrappers/Section"

/**
 * An Element is a part of a section. It represents an information that should be stored in a section.
 * The name of an element is like a title (e.g. Username) and the value is the actual information that
 * should be stored (e.g. the actual username)
 */
export class Element{

    /**
     * Unique identifier of element
     */
    private _id: number

    /**
     * Name of element
     */
    private _name: string

    /**
     * Position (index) of element in section
     */
    private _pos_index: number

    /**
     * Unique identifier of section the element is part of
     */
    private _section_id: number

    /**
     * Value of element
     */
    private _value: string

    /**
     * Type of element (e.g. password, cleartext etc.)
     */
    private _type: Types.Element.ElementType


    /**
    * @param id Unique identifier of element
    * @param name Name of new element
    * @param value Actual value of new element
    * @param type Type of element (e.g. password, cleartext etc.)
    * @param pos_index Position (index) of element in section
    * @param section_id Unique identifier of section the new element will be part of
    */
    constructor(id: number, name: string, value: string, type: Types.Element.ElementType, pos_index: number, section_id: number){
        this._name = name
        this._value = value
        this._type = type
        this._id = id
        this._section_id = section_id
        this._pos_index = pos_index
    }

    /**
    * Creates a new element with the provided properties 
    * @param name Name of new element
    * @param value Actual value of new element
    * @param type Type of element (e.g. password, cleartext etc.)
    * @param connection Task/Transaction for querying
    */
    static async create({name, value, type, transaction} : Types.Element.Params.create): Promise<Element>{
        
        try{
            const queryObject = transaction ? transaction : conn

            const queryData = [name,value, type]
            const elementData = await queryObject.one(elementQueries.create, queryData)
            return new Element(elementData.id, elementData.name, elementData.value, elementData.type, elementData.pos_index, elementData.section_id)
        }catch(err: unknown){
            throw new Exception("Failed to create new element", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        } 
    }

    /**
    * Tries to fetch the element with the provided unique identifier
    * @param id Unique identifier of element to be found 
    */
    static async findById({id} : Types.Element.Params.findById): Promise<Element|null>{
        const exists = await this.exists({id: id})
        if(!exists) return null

        try{
            const queryData = [id]
            const elementData = await conn.one(elementQueries.findById, queryData)

            return new Element(elementData.id, elementData.name, elementData.value, elementData.type, elementData.pos_index, elementData.section_id)
        }catch(err: unknown){
            throw new Exception("Failed to find element", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    /**
    * Checks for existence of an element with the provided unique identifier
    * @param id Unique identifier to check existence for 
    * @returns true if an element with the provided id was found, else false
    */
    static async exists({id}: Types.Element.Params.exists): Promise<boolean>{
        try{
            const existsData = await conn.one(elementQueries.exists, [id])
            return existsData.exists
        }catch(err: unknown){
            throw new Exception("Failed to check for existence", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    /**
    * Deletes the element with provided unique identifier
    * @param id Unique identifier of element to be deleted
    * @param connection Connection/Transaction for queyring
    */
    static async deleteById({id, transaction} : Types.Element.Params.deleteById): Promise <void>{
        const exists = await this.exists({id: id})
        if(!exists) throw new Exception("Element to deleted does not exist!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        try{
            const queryObject = transaction ? transaction : conn
            const queryData = [id]
            await queryObject.none(elementQueries.deleteById, queryData)
        }catch(err: unknown){
            throw new Exception("Failed to delete element!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    

    
    //#region Getters & Setters

    /**
    * Sets new section of an element
    * @param id Unique identifier of element to be moved to another section
    * @param new_section_id Unique identifier of section the element should be moved to
    * @param transaction Transaction for querying
    */
    static async setSection({id, new_section_id, transaction}: Types.Element.Params.setSection){
        let exists = await Section.exists({id: new_section_id})
        if(!exists && new_section_id != -1) 
            throw new Exception("Failed to find section!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
        
        exists = await Element.exists({id: id})
        if(!exists) 
            throw new Exception("Failed to find element!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        const queryObject = transaction ? transaction : conn

        try{
            const queryData = [id, new_section_id]
            await queryObject.none(elementQueries.setSection, queryData)
        }catch(err: unknown){
            throw new Exception("Failed to change section_id of element!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }
    
    /**
    * Sets new position (index) of an element
    * @param id Unique identifier of element to change position of
    * @param new_pos New position (index)
    * @param transaction Transaction for querying
    */
    static async setPosition({id, new_pos_index, transaction}:Types.Element.Params.setPosition) : Promise<void>{
        const exists = await Element.exists({id: id})
        if(!exists) throw new Exception("Failed to find element to be repositioned!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
        
        const queryObject = transaction ? transaction : conn

        try{
            await queryObject.none(elementQueries.setPosition,[id, new_pos_index])
        }catch(err){
            throw new Exception("Failed to change elements position!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    static async setName({id, new_name, transaction} : Types.Element.Params.setName) : Promise<void>{
        //TODO: Parameter validation
        const exists = await Element.exists({id: id})
        if(!exists)
            throw new Exception("Failed to find element to change name of!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        try{
            const queryObject = transaction ? transaction : conn
            const queryData = [id, new_name]

            await queryObject.none(elementQueries.setName, queryData)
        }catch(err: unknown){
            throw new Exception("Failed to change name of element!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    static async setValue({id, new_value, transaction}: Types.Element.Params.setValue) : Promise<void>{
        const exists = await Element.exists({id: id})
        if(!exists)
            throw new Exception("Failed to find element to change value of!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        try{
            const queryObject = transaction ? transaction : conn
            const queryData = [id, new_value]

            await queryObject.none(elementQueries.setValue, queryData)
        }catch(err: unknown){
            throw new Exception("Failed to change value of element!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    static async setType({id, new_type, transaction} : Types.Element.Params.setType) : Promise<void>{
        const exists = await Element.exists({id: id})
        if(!exists)
            throw new Exception("Failed to find element to change type of!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        try{
            const queryObject = transaction ? transaction : conn
            const queryData = [id, new_type]

            await queryObject.none(elementQueries.setType, queryData)
        }catch(err: unknown){
            throw new Exception("Failed to change type of element!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    get id(): number{
        return this._id
    }

    get name(): string{
        return this._name
    }

    get value(): string{
        return this._value
    }

    get type(): Types.Element.ElementType{
        return this._type
    }

    get section_id(): number{
        return this._section_id
    }

    get pos_index(): number{
        return this._pos_index
    }
    //#endregion
}