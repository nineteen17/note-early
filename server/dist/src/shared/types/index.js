// User Roles
export var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "ADMIN";
    UserRole["STUDENT"] = "STUDENT";
    UserRole["SUPER_ADMIN"] = "SUPER_ADMIN";
})(UserRole || (UserRole = {}));
// Subscription Plans
export var SubscriptionPlan;
(function (SubscriptionPlan) {
    SubscriptionPlan["FREE"] = "free";
    SubscriptionPlan["HOME"] = "home";
    SubscriptionPlan["PRO"] = "pro";
})(SubscriptionPlan || (SubscriptionPlan = {}));
// Reading Module Level
export var ReadingLevel;
(function (ReadingLevel) {
    ReadingLevel[ReadingLevel["LEVEL_1"] = 1] = "LEVEL_1";
    ReadingLevel[ReadingLevel["LEVEL_2"] = 2] = "LEVEL_2";
    ReadingLevel[ReadingLevel["LEVEL_3"] = 3] = "LEVEL_3";
    ReadingLevel[ReadingLevel["LEVEL_4"] = 4] = "LEVEL_4";
    ReadingLevel[ReadingLevel["LEVEL_5"] = 5] = "LEVEL_5";
    ReadingLevel[ReadingLevel["LEVEL_6"] = 6] = "LEVEL_6";
    ReadingLevel[ReadingLevel["LEVEL_7"] = 7] = "LEVEL_7";
    ReadingLevel[ReadingLevel["LEVEL_8"] = 8] = "LEVEL_8";
    ReadingLevel[ReadingLevel["LEVEL_9"] = 9] = "LEVEL_9";
    ReadingLevel[ReadingLevel["LEVEL_10"] = 10] = "LEVEL_10";
})(ReadingLevel || (ReadingLevel = {}));
// Module Type Enum
export var ModuleType;
(function (ModuleType) {
    ModuleType["CURATED"] = "Adventure";
    ModuleType["CUSTOM"] = "custom";
})(ModuleType || (ModuleType = {}));
// --- ADDED Language Enum ---
export var Language;
(function (Language) {
    Language["UK"] = "UK";
    Language["US"] = "US";
})(Language || (Language = {}));
// Define allowed genres for the NEW genre column
export const allowedGenres = ['History', 'Adventure', 'Science', 'Non-Fiction', 'Fantasy', 'Biography', 'Mystery', 'Science-Fiction', 'Folktale', 'Custom'];
