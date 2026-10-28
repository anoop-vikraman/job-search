export interface CategoryMeta {
    name: string;
    icon: string;
    color: string;
}

export const CATEGORIES: CategoryMeta[] = [
    { name: 'Plumbing', icon: 'water', color: '#3B82F6' },
    { name: 'Electrical', icon: 'flash', color: '#F59E0B' },
    { name: 'Cleaning', icon: 'sparkles', color: '#10B981' },
    { name: 'Moving', icon: 'car', color: '#6366F1' },
    { name: 'Painting', icon: 'color-palette', color: '#EC4899' },
    { name: 'Writing', icon: 'document-text', color: '#8B5CF6' },
    { name: 'Design', icon: 'brush', color: '#F97316' },
    { name: 'Coding', icon: 'code-slash', color: '#14B8A6' },
    { name: 'Others', icon: 'add', color: '#9CA3AF' },
];

export const getCategoryMeta = (name: string): CategoryMeta => {
    return CATEGORIES.find(c => c.name === name) ?? { name, icon: 'briefcase', color: '#9CA3AF' };
};
