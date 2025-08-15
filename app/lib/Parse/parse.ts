import { initializeParse } from "@parse/react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import Parse from "parse/react-native"
import 'react-native-get-random-values';


// Runtime guard + type narrowing
const getEnv = (key: string): string => {
  const v = process.env[key]
  if (!v) throw new Error(`Missing required env var: ${key}`)
  return v
}

// Parse server details (now guaranteed strings)
const PARSE_SERVER_URL = getEnv("EXPO_PUBLIC_SERVER_URL")
const PARSE_APP_ID = getEnv("EXPO_PUBLIC_APP_ID")
const PARSE_JS_KEY = getEnv("EXPO_PUBLIC_JAVASCRIPT_KEY")

// console.log("Initializing Parse with server URL:", PARSE_SERVER_URL)

// Initialize Parse with AsyncStorage for React Native
initializeParse(
  PARSE_SERVER_URL,
  PARSE_APP_ID,
  PARSE_JS_KEY || 'undefined'
)

// Configure Parse only once
if (!Parse.applicationId) {
  // @ts-ignore - serverURL is writeable at runtime
  Parse.serverURL = PARSE_SERVER_URL
  Parse.initialize(PARSE_APP_ID, PARSE_JS_KEY)
  
  // Set AsyncStorage first
  Parse.setAsyncStorage(AsyncStorage)
  
  // Then enable local datastore
  Parse.enableLocalDatastore()
}

// Type-safe wrapper functions
export const getCurrentUser = async (): Promise<Parse.User | null> => {
  try {
    return await Parse.User.currentAsync()
  } catch (error) {
    console.error("Error getting current user:", error)
    return null
  }
}

export const fetchAllUsers = async (): Promise<Parse.User[]> => {
  try {
    const query = new Parse.Query('_User')
    const results = await query.find()
    return results as unknown as Parse.User[]
  } catch (error) {
    console.error("Error fetching users:", error)
    return []
  }
}

export default Parse