import { useState, useEffect } from 'react';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export function useSuppliers() {
  const { currentUser } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setSuppliers([]);
      setLoading(false);
      return;
    }

    const suppliersRef = collection(db, 'users', currentUser.uid, 'suppliers');
    const q = query(suppliersRef, orderBy('name'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const suppliersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Supplier[];
        setSuppliers(suppliersData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching suppliers:', error);
        setSuppliers([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const addSupplier = async (supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const suppliersRef = collection(db, 'users', currentUser.uid, 'suppliers');
    const newSupplier = {
      ...supplier,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const docRef = await addDoc(suppliersRef, newSupplier);
    return docRef.id;
  };

  const updateSupplier = async (id: string, supplier: Partial<Supplier>) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const supplierRef = doc(db, 'users', currentUser.uid, 'suppliers', id);
    await updateDoc(supplierRef, {
      ...supplier,
      updatedAt: new Date(),
    });
  };

  const deleteSupplier = async (id: string) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const supplierRef = doc(db, 'users', currentUser.uid, 'suppliers', id);
    await deleteDoc(supplierRef);
  };

  return { suppliers, loading, addSupplier, updateSupplier, deleteSupplier };
}

