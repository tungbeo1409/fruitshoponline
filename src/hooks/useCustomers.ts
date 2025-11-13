import { useState, useEffect } from 'react';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, deleteField } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export interface Customer {
  id: string;
  name: string;
  phone?: string; // Không bắt buộc
  email?: string;
  address?: string;
  notes?: string;
  image?: string; // Ảnh khách hàng (base64)
  isActive?: boolean; // Mặc định true nếu không có
  createdAt?: Date;
  updatedAt?: Date;
}

export function useCustomers() {
  const { currentUser } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setCustomers([]);
      setLoading(false);
      return;
    }

    const customersRef = collection(db, 'users', currentUser.uid, 'customers');
    // Query without orderBy to avoid index requirement, we'll sort manually
    const q = query(customersRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const customersData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Mặc định isActive = true nếu không có
            isActive: data.isActive !== undefined ? data.isActive : true,
            // Convert Firestore Timestamp to Date if needed
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
          };
        }) as Customer[];
        
        // Sort manually by name
        customersData.sort((a, b) => a.name.localeCompare(b.name));
        
        setCustomers(customersData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching customers:', error);
        setCustomers([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const addCustomer = async (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    // Remove undefined values (Firestore doesn't accept undefined)
    const cleanCustomer: any = {};
    Object.keys(customer).forEach(key => {
      const value = (customer as any)[key];
      if (value !== undefined && value !== null) {
        cleanCustomer[key] = value;
      }
    });
    
    const customersRef = collection(db, 'users', currentUser.uid, 'customers');
    const newCustomer = {
      ...cleanCustomer,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const docRef = await addDoc(customersRef, newCustomer);
    return docRef.id;
  };

  const updateCustomer = async (id: string, customer: Partial<Customer>) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    // Always update name if provided
    if (customer.name !== undefined) {
      updateData.name = customer.name;
    }
    
    // For optional fields: if empty string, delete from Firestore; otherwise update
    const optionalFields: (keyof Customer)[] = ['phone', 'email', 'address', 'notes', 'image'];
    optionalFields.forEach(field => {
      if (customer[field] !== undefined) {
        // Field is provided in update
        if (customer[field] === '' || customer[field] === null) {
          // Empty string or null means delete the field
          updateData[field] = deleteField();
        } else {
          // Non-empty value means update it
          updateData[field] = customer[field];
        }
      }
    });
    
    // Handle isActive separately
    if (customer.isActive !== undefined) {
      updateData.isActive = customer.isActive;
    }
    
    const customerRef = doc(db, 'users', currentUser.uid, 'customers', id);
    await updateDoc(customerRef, updateData);
  };

  const deleteCustomer = async (id: string) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const customerRef = doc(db, 'users', currentUser.uid, 'customers', id);
    await deleteDoc(customerRef);
  };

  return { customers, loading, addCustomer, updateCustomer, deleteCustomer };
}

