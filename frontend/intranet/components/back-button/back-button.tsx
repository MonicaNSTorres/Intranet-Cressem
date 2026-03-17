"use client";

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

const BackButton = () => {
    const router = useRouter();

    const handleBack = () => {
        router.back();
    };

    return (
        <div className="flex flex-col items-start">
            <button onClick={handleBack} className="flex items-center text-lg text-gray-700 dark:text-white font-semibold mb-2 space-x-2 hover:cursor-pointer"> 
                <ArrowLeft size={25} />
                <span>Voltar</span>
            </button>
        </div>
    );
}
export default BackButton;