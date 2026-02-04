import { useState, useCallback } from 'react';
import { Modal } from '../../common/Modal';
import { Input } from '../../common/Input';
import { Button } from '../../common/Button';
import { useTeam } from '../../../context/TeamContext';
import { useUI } from '../../../context/UIContext';
import { useAuth } from '../../../context/AuthContext';
import styles from './InviteModal.module.css';

type InviteStatus = 'idle' | 'sending' | 'success' | 'error';

interface FormData {
  email: string;
  name: string;
}

interface FormErrors {
  email?: string;
  name?: string;
}

/**
 * Validates an email address format.
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * InviteModal component for inviting new team members.
 * Only accessible to admin users.
 *
 * Uses Supabase magic link (OTP) to send invitation emails.
 * For true admin invites, a Supabase Edge Function would be needed.
 */
export function InviteModal() {
  const { inviteTeamMember } = useTeam();
  const { inviteModal, closeInviteModal } = useUI();
  const { isAdmin } = useAuth();

  const [formData, setFormData] = useState<FormData>({ email: '', name: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<InviteStatus>('idle');
  const [resultMessage, setResultMessage] = useState('');

  /**
   * Validates the form and returns true if valid.
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  /**
   * Handles form field changes.
   */
  const handleChange = useCallback(
    (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      // Clear field error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
      // Clear any previous result message
      if (status !== 'idle' && status !== 'sending') {
        setStatus('idle');
        setResultMessage('');
      }
    },
    [errors, status]
  );

  /**
   * Handles form submission.
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      setStatus('sending');
      setResultMessage('');

      const result = await inviteTeamMember(
        formData.email.trim(),
        formData.name.trim()
      );

      if (result.success) {
        setStatus('success');
        setResultMessage(result.message);
        // Reset form on success
        setFormData({ email: '', name: '' });
      } else {
        setStatus('error');
        setResultMessage(result.message);
      }
    },
    [formData, validateForm, inviteTeamMember]
  );

  /**
   * Handles modal close and resets state.
   */
  const handleClose = useCallback(() => {
    closeInviteModal();
    // Reset form state after a short delay to prevent flash during close animation
    setTimeout(() => {
      setFormData({ email: '', name: '' });
      setErrors({});
      setStatus('idle');
      setResultMessage('');
    }, 200);
  }, [closeInviteModal]);

  // Don't render if user is not an admin
  if (!isAdmin) {
    return null;
  }

  const isSubmitting = status === 'sending';

  return (
    <Modal
      isOpen={inviteModal.isOpen}
      onClose={handleClose}
      title="Invite Team Member"
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <p className={styles.description}>
          Send an invitation email to add a new team member. They will receive a
          magic link to join the team.
        </p>

        <div className={styles.fields}>
          <Input
            label="Email Address"
            type="email"
            placeholder="colleague@example.com"
            value={formData.email}
            onChange={handleChange('email')}
            error={errors.email}
            disabled={isSubmitting}
            autoComplete="email"
            required
            aria-describedby={errors.email ? 'email-error' : undefined}
          />

          <Input
            label="Full Name"
            type="text"
            placeholder="Jane Smith"
            value={formData.name}
            onChange={handleChange('name')}
            error={errors.name}
            disabled={isSubmitting}
            autoComplete="name"
            required
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
        </div>

        {/* Status message */}
        {resultMessage && (
          <div
            className={`${styles.message} ${
              status === 'success' ? styles.success : styles.error
            }`}
            role={status === 'error' ? 'alert' : 'status'}
            aria-live="polite"
          >
            {status === 'success' && (
              <span className={styles.messageIcon} aria-hidden="true">
                &#10003;
              </span>
            )}
            {status === 'error' && (
              <span className={styles.messageIcon} aria-hidden="true">
                &#33;
              </span>
            )}
            <span>{resultMessage}</span>
          </div>
        )}

        <div className={styles.actions}>
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Invitation'}
          </Button>
        </div>

        {/* Note about Supabase limitations */}
        <p className={styles.note}>
          <strong>Note:</strong> This uses magic link invitations. The invited
          user will set their password when they first sign in.
        </p>
      </form>
    </Modal>
  );
}
