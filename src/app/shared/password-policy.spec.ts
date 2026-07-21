import { PASSWORD_REQUIREMENTS, isPasswordValid } from './password-policy';

describe('password-policy', () => {
    it('should expose exactly four requirements: length, uppercase, digit, special char', () => {
        expect(PASSWORD_REQUIREMENTS.map(r => r.key)).toEqual(['length', 'uppercase', 'digit', 'special']);
    });

    describe('isPasswordValid', () => {
        it('should reject an empty password', () => {
            expect(isPasswordValid('')).toBeFalse();
        });

        it('should reject a password missing an uppercase letter', () => {
            expect(isPasswordValid('lowercase1!')).toBeFalse();
        });

        it('should reject a password missing a digit', () => {
            expect(isPasswordValid('NoDigitsHere!')).toBeFalse();
        });

        it('should reject a password missing a special character', () => {
            expect(isPasswordValid('NoSpecial123')).toBeFalse();
        });

        it('should reject a password shorter than 8 characters even if it has every character class', () => {
            expect(isPasswordValid('Ab1!')).toBeFalse();
        });

        it('should accept a password satisfying all four rules', () => {
            expect(isPasswordValid('Str0ng!Pass')).toBeTrue();
        });

        it('should match the backend\'s exact STRONG_PASSWORD_PATTERN behavior on a boundary case (exactly 8 chars)', () => {
            expect(isPasswordValid('Ab1defg!')).toBeTrue();
        });
    });
});
