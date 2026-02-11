import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';
    
// The `cn` function is a utility to merge class names (using clsx and tailwind-merge)
describe('cn utility', () => {
    it('should merge class names correctly', () => {
        const result = cn('c1', 'c2');
        expect(result).toBe('c1 c2');
    });

    it('should handle conditional class names', () => {
        // True condition adds class, false condition omits it
        const result = cn('c1', true && 'c2', false && 'c3');
        expect(result).toBe('c1 c2');
    });

    it('should handle arrays and objects', () => {
        // Should handle array input and object conditional input
        const result = cn(['c1', 'c2'], { c3: true, c4: false });
        expect(result).toBe('c1 c2 c3');
    });

    it('should merge tailwind classes properly (override)', () => {
        // This tests tailwind-merge functionality: later class overrides earlier conflicting class
        // 'p-4' (padding: 1rem) overrides 'px-2 py-1' (padding-x/y different)
        const result = cn('px-2 py-1', 'p-4');
        expect(result).toBe('p-4');
    });
});
