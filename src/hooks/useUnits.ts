import { useState, useEffect } from 'react';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export interface Unit {
  id: string;
  name: string;
  symbol: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export function useUnits() {
  const { currentUser } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setUnits([]);
      setLoading(false);
      return;
    }

    const unitsRef = collection(db, 'users', currentUser.uid, 'units');
    const q = query(unitsRef, orderBy('name'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const unitsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Unit[];
        setUnits(unitsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching units:', error);
        setUnits([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const addUnit = async (unit: Omit<Unit, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const unitsRef = collection(db, 'users', currentUser.uid, 'units');
    const newUnit = {
      ...unit,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const docRef = await addDoc(unitsRef, newUnit);
    return docRef.id;
  };

  const updateUnit = async (id: string, unit: Partial<Unit>) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const unitRef = doc(db, 'users', currentUser.uid, 'units', id);
    await updateDoc(unitRef, {
      ...unit,
      updatedAt: new Date(),
    });
  };

  const deleteUnit = async (id: string) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const unitRef = doc(db, 'users', currentUser.uid, 'units', id);
    await deleteDoc(unitRef);
  };

  return { units, loading, addUnit, updateUnit, deleteUnit };
}

