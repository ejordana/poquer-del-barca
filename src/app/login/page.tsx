'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';

export default function LoginPage() {
  const router = useRouter();
  const { setIsSelectorOpen } = useUser();

  useEffect(() => {
    setIsSelectorOpen(true);
    router.replace('/');
  }, [router, setIsSelectorOpen]);

  return null;
}
