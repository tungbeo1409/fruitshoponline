import { useState, useEffect } from 'react';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
  image: string;
  category: string;
  stock: number;
  supplier: string;
  importPrice: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export function useProducts() {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setProducts([]);
      setLoading(false);
      return;
    }

    const productsRef = collection(db, 'users', currentUser.uid, 'products');
    const q = query(productsRef, orderBy('name'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const productsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[];
        setProducts(productsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching products:', error);
        setProducts([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const addProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const productsRef = collection(db, 'users', currentUser.uid, 'products');
    const newProduct = {
      ...product,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const docRef = await addDoc(productsRef, newProduct);
    return docRef.id;
  };

  const updateProduct = async (id: string, product: Partial<Product>) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const productRef = doc(db, 'users', currentUser.uid, 'products', id);
    await updateDoc(productRef, {
      ...product,
      updatedAt: new Date(),
    });
  };

  const deleteProduct = async (id: string) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const productRef = doc(db, 'users', currentUser.uid, 'products', id);
    await deleteDoc(productRef);
  };

  return { products, loading, addProduct, updateProduct, deleteProduct };
}

