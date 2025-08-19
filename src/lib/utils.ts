import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatGrade(grade: number): string {
  return grade.toFixed(1);
}

export function calculateFinalGrade(grades: { grade: number; weight: number }[]): number {
  if (grades.length === 0) return 0;
  
  const totalWeight = grades.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return 0;
  
  const weightedSum = grades.reduce((sum, item) => sum + (item.grade * item.weight), 0);
  return weightedSum / totalWeight;
}

export function validateWeightSum(weights: number[]): boolean {
  const sum = weights.reduce((acc, weight) => acc + weight, 0);
  return Math.abs(sum - 100) < 0.01; // Allow for small floating point errors
}

export function getGradeColor(grade: number): string {
  if (grade >= 90) return 'text-green-600';
  if (grade >= 80) return 'text-blue-600';
  if (grade >= 70) return 'text-yellow-600';
  if (grade >= 60) return 'text-orange-600';
  return 'text-red-600';
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
