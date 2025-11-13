import { useState, useEffect } from 'react';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export function useCategories() {
  const { currentUser } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setCategories([]);
      setLoading(false);
      return;
    }

    const categoriesRef = collection(db, 'users', currentUser.uid, 'categories');
    const q = query(categoriesRef, orderBy('name'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const categoriesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Category[];
        setCategories(categoriesData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching categories:', error);
        setCategories([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const addCategory = async (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const categoriesRef = collection(db, 'users', currentUser.uid, 'categories');
    const newCategory = {
      ...category,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const docRef = await addDoc(categoriesRef, newCategory);
    return docRef.id;
  };

  const updateCategory = async (id: string, category: Partial<Category>) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const categoryRef = doc(db, 'users', currentUser.uid, 'categories', id);
    await updateDoc(categoryRef, {
      ...category,
      updatedAt: new Date(),
    });
  };

  const deleteCategory = async (id: string) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const categoryRef = doc(db, 'users', currentUser.uid, 'categories', id);
    await deleteDoc(categoryRef);
  };

  return { categories, loading, addCategory, updateCategory, deleteCategory };
}

