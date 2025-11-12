import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Config extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare key: string

  @column()
  declare value: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  /**
   * Helper method to get config value by key
   * Returns the value parsed as JSON (supports boolean, number, string, etc.)
   */
  static async get<T = any>(key: string): Promise<T | null> {
    const config = await Config.findBy('key', key)
    if (!config?.value) {
      return null
    }
    
    try {
      return JSON.parse(config.value) as T
    } catch {
      // If not valid JSON, return as string
      return config.value as T
    }
  }

  /**
   * Helper method to set config value
   * Automatically serializes the value as JSON
   */
  static async set(key: string, value: any): Promise<Config> {
    const jsonValue = typeof value === 'string' ? value : JSON.stringify(value)
    const config = await Config.firstOrNew({ key }, { value: jsonValue })
    config.value = jsonValue
    await config.save()
    return config
  }
}