import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebhookService } from '../webhook.service';
import { db } from '@/db';
import Stripe from 'stripe';
// Remove unused imports that are only needed for type information

// Disable the any type warning for test files
/* eslint-disable @typescript-eslint/no-explicit-any */

// Define interfaces to match our enhanced types in the webhook service
interface EnhancedStripeSubscription extends Stripe.Subscription {
  current_period_start: number;
  current_period_end: number;
}

interface EnhancedStripeInvoice extends Stripe.Invoice {
  subscription?: string;
  payment_intent?: string;
}

// Create mocks for all db functions and chainable methods
const mockExecute = vi.fn().mockResolvedValue([]);
const mockWhere = vi.fn().mockReturnValue({ execute: mockExecute, limit: vi.fn().mockReturnValue({ execute: mockExecute }) });
const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
const mockValues = vi.fn().mockReturnValue({ execute: mockExecute });

// Mock the db module
vi.mock('@/db', () => {
  return {
    db: {
      // Mock the query object with specific tables
      query: {
        profiles: { 
          findFirst: vi.fn()
        },
        customerSubscriptions: { 
          findFirst: vi.fn()
        },
        subscriptionPlans: { 
          findFirst: vi.fn()
        }
      },
      // Mock insert function with chainable methods
      insert: vi.fn(() => ({
        values: mockValues
      })),
      // Mock update function with chainable methods
      update: vi.fn(() => ({
        set: mockSet
      })),
      // Mock select function with chainable methods
      select: vi.fn(() => ({
        from: mockFrom
      })),
    },
  };
});

// Mock the logger
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('WebhookService', () => {
  let webhookService: WebhookService;
  
  // Mock Stripe event objects
  const mockCheckoutSession = {
    id: 'cs_test_123',
    customer: 'cus_test_123',
    customer_email: 'test@example.com',
    subscription: 'sub_test_123',
  } as unknown as Stripe.Checkout.Session;
  
  const mockSubscription: EnhancedStripeSubscription = {
    id: 'sub_test_123',
    customer: 'cus_test_123',
    status: 'active',
    items: {
      data: [{ price: { id: 'price_test_123' } }],
    },
    current_period_start: Math.floor(Date.now() / 1000) - 86400,
    current_period_end: Math.floor(Date.now() / 1000) + 86400,
    cancel_at_period_end: false,
  } as unknown as EnhancedStripeSubscription;
  
  const mockInvoice: EnhancedStripeInvoice = {
    id: 'in_test_123',
    customer: 'cus_test_123',
    subscription: 'sub_test_123',
    payment_intent: 'pi_test_123',
    amount_paid: 2000, // $20.00 in cents
    amount_due: 2000,
    currency: 'usd',
    collection_method: 'charge_automatically',
    hosted_invoice_url: 'https://stripe.com/receipt',
  } as unknown as EnhancedStripeInvoice;

  // User profile mock
  const mockUser = {
    id: 'usr_test_123',
    email: 'test@example.com',
    stripeCustomerId: 'cus_test_123',
  };

  // Subscription plan mock
  const mockPlan = {
    id: 'price_test_123',
    name: 'Pro Plan',
  };

  // Subscription record mock
  const mockSubscriptionRecord = {
    id: 'sub_test_123',
    userId: 'usr_test_123',
    planId: 'price_test_123',
    stripeCustomerId: 'cus_test_123',
    status: 'active',
  };

  beforeEach(() => {
    webhookService = new WebhookService();
    vi.clearAllMocks();
  });

  describe('processWebhookEvent', () => {
    it('should call the appropriate handler based on event type', async () => {
      // Spy on all handler methods
      const checkoutSpy = vi.spyOn(webhookService as any, 'handleCheckoutSessionCompleted').mockResolvedValue(undefined);
      const subscriptionCreatedSpy = vi.spyOn(webhookService as any, 'handleSubscriptionCreated').mockResolvedValue(undefined);
      const subscriptionUpdatedSpy = vi.spyOn(webhookService as any, 'handleSubscriptionUpdated').mockResolvedValue(undefined);
      const subscriptionDeletedSpy = vi.spyOn(webhookService as any, 'handleSubscriptionDeleted').mockResolvedValue(undefined);
      const invoicePaidSpy = vi.spyOn(webhookService as any, 'handleInvoicePaid').mockResolvedValue(undefined);
      const invoiceFailedSpy = vi.spyOn(webhookService as any, 'handleInvoicePaymentFailed').mockResolvedValue(undefined);
      
      // Test each event type
      const eventTypes = [
        'checkout.session.completed',
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'invoice.paid',
        'invoice.payment_failed',
      ];
      
      for (const eventType of eventTypes) {
        const event = {
          type: eventType,
          data: { object: {} },
        } as unknown as Stripe.Event;
        
        await webhookService.processWebhookEvent(event);
      }
      
      // Verify each handler was called
      expect(checkoutSpy).toHaveBeenCalledTimes(1);
      expect(subscriptionCreatedSpy).toHaveBeenCalledTimes(1);
      expect(subscriptionUpdatedSpy).toHaveBeenCalledTimes(1);
      expect(subscriptionDeletedSpy).toHaveBeenCalledTimes(1);
      expect(invoicePaidSpy).toHaveBeenCalledTimes(1);
      expect(invoiceFailedSpy).toHaveBeenCalledTimes(1);
    });
    
    it('should handle unknown event types gracefully', async () => {
      const event = {
        type: 'unknown.event',
        data: { object: {} },
      } as unknown as Stripe.Event;
      
      await webhookService.processWebhookEvent(event);
      // No error should be thrown
    });
  });

  describe('handleCheckoutSessionCompleted', () => {
    it('should find user by email and log the checkout completion', async () => {
      // Configure mock return values
      (db.query.profiles.findFirst as any).mockResolvedValueOnce(mockUser);
      
      await (webhookService as any).handleCheckoutSessionCompleted(mockCheckoutSession);
      
      expect(db.query.profiles.findFirst).toHaveBeenCalled();
    });
    
    it('should handle missing customer or subscription', async () => {
      const incompleteSession = { 
        id: 'cs_test_123',
        // Missing customer and subscription 
      } as Stripe.Checkout.Session;
      
      await (webhookService as any).handleCheckoutSessionCompleted(incompleteSession);
      // Should not throw error
    });
    
    it('should handle missing customer email', async () => {
      const sessionWithoutEmail = { 
        id: 'cs_test_123',
        customer: 'cus_test_123',
        subscription: 'sub_test_123',
        // Missing customer_email
      } as Stripe.Checkout.Session;
      
      await (webhookService as any).handleCheckoutSessionCompleted(sessionWithoutEmail);
      // Should not throw error
    });
    
    it('should handle user not found', async () => {
      (db.query.profiles.findFirst as any).mockResolvedValueOnce(null);
      
      await (webhookService as any).handleCheckoutSessionCompleted(mockCheckoutSession);
      // Should not throw error
    });
  });

  describe('handleSubscriptionCreated', () => {
    it('should create a new subscription record', async () => {
      // Configure mock return values
      (db.query.profiles.findFirst as any).mockResolvedValueOnce(mockUser);
      (db.query.subscriptionPlans.findFirst as any).mockResolvedValueOnce(mockPlan);
      
      await (webhookService as any).handleSubscriptionCreated(mockSubscription);
      
      expect(db.query.profiles.findFirst).toHaveBeenCalled();
      expect(db.query.subscriptionPlans.findFirst).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalled();
    });
    
    it('should handle missing plan ID', async () => {
      const subscriptionWithoutPlan = {
        ...mockSubscription,
        items: { data: [] },
      } as unknown as EnhancedStripeSubscription;
      
      await (webhookService as any).handleSubscriptionCreated(subscriptionWithoutPlan);
      
      expect(db.insert).not.toHaveBeenCalled();
    });
    
    it('should handle user not found', async () => {
      (db.query.profiles.findFirst as any).mockResolvedValueOnce(null);
      
      await (webhookService as any).handleSubscriptionCreated(mockSubscription);
      
      expect(db.insert).not.toHaveBeenCalled();
    });
    
    it('should handle plan not found', async () => {
      (db.query.profiles.findFirst as any).mockResolvedValueOnce(mockUser);
      (db.query.subscriptionPlans.findFirst as any).mockResolvedValueOnce(null);
      
      await (webhookService as any).handleSubscriptionCreated(mockSubscription);
      
      expect(db.insert).not.toHaveBeenCalled();
    });
  });

  describe('handleSubscriptionUpdated', () => {
    it('should update an existing subscription record', async () => {
      // Configure mock return values
      (db.query.customerSubscriptions.findFirst as any).mockResolvedValueOnce(mockSubscriptionRecord);
      
      await (webhookService as any).handleSubscriptionUpdated(mockSubscription);
      
      expect(db.query.customerSubscriptions.findFirst).toHaveBeenCalled();
      expect(db.update).toHaveBeenCalled();
    });
    
    it('should handle subscription not found', async () => {
      (db.query.customerSubscriptions.findFirst as any).mockResolvedValueOnce(null);
      
      await (webhookService as any).handleSubscriptionUpdated(mockSubscription);
      
      expect(db.update).not.toHaveBeenCalled();
    });
  });

  describe('handleSubscriptionDeleted', () => {
    it('should update the status of a deleted subscription', async () => {
      // Configure mock return values
      (db.query.customerSubscriptions.findFirst as any).mockResolvedValueOnce(mockSubscriptionRecord);
      
      const deletedSubscription = {
        ...mockSubscription,
        status: 'canceled',
      } as unknown as EnhancedStripeSubscription;
      
      await (webhookService as any).handleSubscriptionDeleted(deletedSubscription);
      
      expect(db.query.customerSubscriptions.findFirst).toHaveBeenCalled();
      expect(db.update).toHaveBeenCalled();
    });
    
    it('should handle subscription not found', async () => {
      (db.query.customerSubscriptions.findFirst as any).mockResolvedValueOnce(null);
      
      await (webhookService as any).handleSubscriptionDeleted(mockSubscription);
      
      expect(db.update).not.toHaveBeenCalled();
    });
  });

  describe('handleInvoicePaid', () => {
    it('should create a payment history record', async () => {
      // Configure mock return values
      (db.query.profiles.findFirst as any).mockResolvedValueOnce(mockUser);
      
      await (webhookService as any).handleInvoicePaid(mockInvoice);
      
      expect(db.query.profiles.findFirst).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalled();
    });
    
    it('should handle missing customer or subscription', async () => {
      const incompleteInvoice = {
        id: 'in_test_123',
        // Missing customer and subscription
      } as unknown as EnhancedStripeInvoice;
      
      await (webhookService as any).handleInvoicePaid(incompleteInvoice);
      
      expect(db.insert).not.toHaveBeenCalled();
    });
    
    it('should handle user not found', async () => {
      (db.query.profiles.findFirst as any).mockResolvedValueOnce(null);
      
      await (webhookService as any).handleInvoicePaid(mockInvoice);
      
      expect(db.insert).not.toHaveBeenCalled();
    });
  });

  describe('handleInvoicePaymentFailed', () => {
    it('should create a failed payment record and update subscription status', async () => {
      // Configure mock return values
      (db.query.profiles.findFirst as any).mockResolvedValueOnce(mockUser);
      
      await (webhookService as any).handleInvoicePaymentFailed(mockInvoice);
      
      expect(db.query.profiles.findFirst).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalled();
      expect(db.update).toHaveBeenCalled();
    });
    
    it('should handle missing customer or subscription', async () => {
      const incompleteInvoice = {
        id: 'in_test_123',
        // Missing customer and subscription
      } as unknown as EnhancedStripeInvoice;
      
      await (webhookService as any).handleInvoicePaymentFailed(incompleteInvoice);
      
      expect(db.insert).not.toHaveBeenCalled();
      expect(db.update).not.toHaveBeenCalled();
    });
    
    it('should handle user not found', async () => {
      (db.query.profiles.findFirst as any).mockResolvedValueOnce(null);
      
      await (webhookService as any).handleInvoicePaymentFailed(mockInvoice);
      
      expect(db.insert).not.toHaveBeenCalled();
      expect(db.update).not.toHaveBeenCalled();
    });
  });
}); 