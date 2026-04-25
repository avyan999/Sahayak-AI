import { createContext, useContext, useState, useEffect } from 'react'
import { auth, db } from '../firebase'
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (userDoc.exists()) {
            setUser({ uid: firebaseUser.uid, email: firebaseUser.email, ...userDoc.data() })
          } else {
            // Fallback if firestore document doesn't exist
            setUser({ uid: firebaseUser.uid, email: firebaseUser.email, role: 'volunteer' })
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
          setUser(null)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const login = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password)
  }

  const register = async (email, password, userData) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const newUser = userCredential.user
    
    await setDoc(doc(db, 'users', newUser.uid), {
      name: userData.name,
      role: userData.role,
      skills: userData.skills || [],
      location: userData.location || '',
      createdAt: new Date().toISOString()
    })
    
    return newUser
  }

  const logoutUser = () => {
    return signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout: logoutUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
