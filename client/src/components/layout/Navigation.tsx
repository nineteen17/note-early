import React from 'react';
import { Home, BookOpen, GraduationCap } from 'lucide-react';

const studentRoutes = [
  {
    title: 'Dashboard',
    href: '/student',
    icon: Home,
  },
  {
    title: 'Modules',
    href: '/student/modules',
    icon: BookOpen,
  },
  {
    title: 'Progress',
    href: '/student/progress',
    icon: GraduationCap,
    children: [
      {
        title: 'Overview',
        href: '/student/progress',
      },
      {
        title: 'Completed',
        href: '/student/progress/completed',
      },
    ],
  },
  // ... rest of the routes ...
];

const Navigation: React.FC = () => {
  // ... rest of the component ...
};

export default Navigation; 