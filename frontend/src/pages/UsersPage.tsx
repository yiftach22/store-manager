import { NavBar } from '../components/NavBar';
import { UsersTab } from '../components/UsersTab';

export function UsersPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      <NavBar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
        <h1 className="text-xl font-bold text-gray-800 mb-6">ניהול עובדים</h1>
        <UsersTab />
      </main>
    </div>
  );
}
