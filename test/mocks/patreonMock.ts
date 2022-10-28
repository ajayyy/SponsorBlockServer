export const activeIdentity = {
    data: {},
    links: {},
    included: [
        {
            attributes: {
                is_monthly: true,
                currently_entitled_amount_cents: 100,
                patron_status: "active_patron",
            },
            id: "id",
            type: "campaign"
        }
    ],
};

export const invalidIdentity = {
    data: {},
    links: {},
    included: [{}],
};

export const formerIdentitySucceed = {
    data: {},
    links: {},
    included: [
        {
            attributes: {
                is_monthly: true,
                campaign_lifetime_support_cents: 500,
                patron_status: "former_patron",
            },
            id: "id",
            type: "campaign"
        }
    ],
};

export const formerIdentityFail = {
    data: {},
    links: {},
    included: [
        {
            attributes: {
                is_monthly: true,
                campaign_lifetime_support_cents: 1,
                patron_status: "former_patron",
            },
            id: "id",
            type: "campaign"
        }
    ],
};

export const fakeOauth = {
    access_token: "test_access_token",
    refresh_token: "test_refresh_token",
    expires_in: 3600,
};