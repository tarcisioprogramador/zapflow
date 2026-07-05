
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  password: 'password',
  role: 'role',
  plan: 'plan',
  avatar: 'avatar',
  phone: 'phone',
  trialStartedAt: 'trialStartedAt',
  trialExpiresAt: 'trialExpiresAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  organizationId: 'organizationId'
};

exports.Prisma.RefreshTokenScalarFieldEnum = {
  id: 'id',
  token: 'token',
  userId: 'userId',
  expiresAt: 'expiresAt',
  revoked: 'revoked',
  replacedBy: 'replacedBy',
  createdAt: 'createdAt'
};

exports.Prisma.OrganizationScalarFieldEnum = {
  id: 'id',
  name: 'name',
  plan: 'plan',
  logo: 'logo',
  stripeCustomerId: 'stripeCustomerId',
  stripeSubscriptionId: 'stripeSubscriptionId',
  stripeSubscriptionStatus: 'stripeSubscriptionStatus',
  stripeCurrentPeriodEnd: 'stripeCurrentPeriodEnd',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WhatsAppNumberScalarFieldEnum = {
  id: 'id',
  number: 'number',
  name: 'name',
  status: 'status',
  instanceId: 'instanceId',
  qrcode: 'qrcode',
  trialExpiresAt: 'trialExpiresAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  organizationId: 'organizationId'
};

exports.Prisma.ConversationScalarFieldEnum = {
  id: 'id',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  whatsappNumberId: 'whatsappNumberId',
  contactId: 'contactId',
  userId: 'userId'
};

exports.Prisma.MessageScalarFieldEnum = {
  id: 'id',
  content: 'content',
  type: 'type',
  from: 'from',
  to: 'to',
  status: 'status',
  mediaUrl: 'mediaUrl',
  isFromBot: 'isFromBot',
  createdAt: 'createdAt',
  conversationId: 'conversationId'
};

exports.Prisma.TagScalarFieldEnum = {
  id: 'id',
  name: 'name',
  color: 'color'
};

exports.Prisma.ConversationTagScalarFieldEnum = {
  conversationId: 'conversationId',
  tagId: 'tagId'
};

exports.Prisma.CrmBoardScalarFieldEnum = {
  id: 'id',
  name: 'name',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  organizationId: 'organizationId'
};

exports.Prisma.CrmStageScalarFieldEnum = {
  id: 'id',
  name: 'name',
  color: 'color',
  position: 'position',
  boardId: 'boardId'
};

exports.Prisma.CrmCardScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  value: 'value',
  position: 'position',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  boardId: 'boardId',
  stageId: 'stageId',
  contactId: 'contactId'
};

exports.Prisma.ContactScalarFieldEnum = {
  id: 'id',
  name: 'name',
  phone: 'phone',
  email: 'email',
  company: 'company',
  tags: 'tags',
  notes: 'notes',
  utmSource: 'utmSource',
  utmMedium: 'utmMedium',
  utmCampaign: 'utmCampaign',
  adId: 'adId',
  adTitle: 'adTitle',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  userId: 'userId'
};

exports.Prisma.KnowledgeBaseItemScalarFieldEnum = {
  id: 'id',
  title: 'title',
  content: 'content',
  category: 'category',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  organizationId: 'organizationId'
};

exports.Prisma.FlowScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  isActive: 'isActive',
  triggerType: 'triggerType',
  triggerValue: 'triggerValue',
  nodes: 'nodes',
  edges: 'edges',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  userId: 'userId'
};

exports.Prisma.FlowExecutionScalarFieldEnum = {
  id: 'id',
  status: 'status',
  context: 'context',
  startedAt: 'startedAt',
  endedAt: 'endedAt',
  flowId: 'flowId'
};

exports.Prisma.CampaignScalarFieldEnum = {
  id: 'id',
  name: 'name',
  message: 'message',
  mediaUrl: 'mediaUrl',
  status: 'status',
  scheduledAt: 'scheduledAt',
  sentAt: 'sentAt',
  totalSent: 'totalSent',
  totalFailed: 'totalFailed',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  userId: 'userId'
};

exports.Prisma.CampaignContactScalarFieldEnum = {
  id: 'id',
  phone: 'phone',
  name: 'name',
  status: 'status',
  sentAt: 'sentAt',
  campaignId: 'campaignId'
};

exports.Prisma.WebhookScalarFieldEnum = {
  id: 'id',
  name: 'name',
  url: 'url',
  events: 'events',
  secret: 'secret',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  organizationId: 'organizationId'
};

exports.Prisma.PaymentScalarFieldEnum = {
  id: 'id',
  stripePaymentIntentId: 'stripePaymentIntentId',
  stripeInvoiceId: 'stripeInvoiceId',
  stripeSubscriptionId: 'stripeSubscriptionId',
  amount: 'amount',
  currency: 'currency',
  status: 'status',
  plan: 'plan',
  description: 'description',
  periodStart: 'periodStart',
  periodEnd: 'periodEnd',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  organizationId: 'organizationId'
};

exports.Prisma.RemarketingSequenceScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  isActive: 'isActive',
  steps: 'steps',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RemarketingExecutionScalarFieldEnum = {
  id: 'id',
  contactId: 'contactId',
  stepIndex: 'stepIndex',
  status: 'status',
  nextRun: 'nextRun',
  createdAt: 'createdAt',
  sequenceId: 'sequenceId'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  User: 'User',
  RefreshToken: 'RefreshToken',
  Organization: 'Organization',
  WhatsAppNumber: 'WhatsAppNumber',
  Conversation: 'Conversation',
  Message: 'Message',
  Tag: 'Tag',
  ConversationTag: 'ConversationTag',
  CrmBoard: 'CrmBoard',
  CrmStage: 'CrmStage',
  CrmCard: 'CrmCard',
  Contact: 'Contact',
  KnowledgeBaseItem: 'KnowledgeBaseItem',
  Flow: 'Flow',
  FlowExecution: 'FlowExecution',
  Campaign: 'Campaign',
  CampaignContact: 'CampaignContact',
  Webhook: 'Webhook',
  Payment: 'Payment',
  RemarketingSequence: 'RemarketingSequence',
  RemarketingExecution: 'RemarketingExecution'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
