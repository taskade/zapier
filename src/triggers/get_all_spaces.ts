import { Bundle, HttpRequestOptions, ZObject } from 'zapier-platform-core';

// FIXME any
interface Membership {
  id: string;
  order: number;
  created_at: string;
  updated_at: string;
  space: any;
  preferences: any;
}

interface MembershipEdge {
  node: Membership;
  cursor: string;
}

const perform = async (z: ZObject, bundle: Bundle) => {
  const spacesReq: HttpRequestOptions = {
    url: 'https://www.taskade.com/graphql',
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'content-type': 'application/json',
      authorization: `bearer ${bundle.authData.access_token}`,
    },
    body: {
      operationName: 'Memberships',
      variables: { filterby: { membershipType: 'space', archived: false } },
      query:
        'query Memberships($filterby: MembershipFiltering) { memberships(filterby: $filterby) { totalCount edges { node { id order space { id name color is_subspace is_unread preferences { avatars_v2 { ... on SpaceAvatarsV2Emoji { emoji } ... on SpaceAvatarsV2Custom { small { hdpi { url size { width height } } } } } } } } } }}',
    },
  };

  const firstResponse = await z.request('https://www.taskade.com/graphql', spacesReq);

  const firstResponseJSON = firstResponse.json;

  const spaceIds = firstResponseJSON.data.memberships.edges.map(
    (e: MembershipEdge) => e.node.space.id,
  );

  const spaces = firstResponseJSON.data.memberships.edges.map((e: MembershipEdge) => ({
    id: e.node.space.id,
    name: e.node.space.name,
  }));

  const foldersReq: HttpRequestOptions = {
    url: 'https://www.taskade.com/graphql',
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'content-type': 'application/json',
      authorization: `bearer ${bundle.authData.access_token}`,
    },
    body: {
      operationName: 'Memberships',
      variables: {
        filterby: {
          membershipType: 'subspace',
          parentSpaceIds: spaceIds,
          archived: false,
        },
      },
      query: `query Memberships($filterby: MembershipFiltering) {
      memberships(filterby: $filterby) {
        totalCount
        edges {
          node {
            id
            order
            space {
              id
              name
              color
              is_subspace
              is_unread
              parent_membership {
                id
                space {
                  id
                  name
                }
              }
              preferences {
                avatars_v2 {
                  ... on SpaceAvatarsV2Emoji {
                    emoji
                  }
                  ... on SpaceAvatarsV2Custom {
                    small {
                      hdpi {
                        url
                        size {
                          width
                          height
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }`,
    },
  };

  return z.request('https://www.taskade.com/graphql', foldersReq).then((response) => {
    response.throwForStatus();
    const results = response.json;

    // You can do any parsing you need for results here before returning them

    const folders = results.data.memberships.edges.map((e: MembershipEdge) => ({
      id: e.node.space.id,
      name: e.node.space.parent_membership.space.name + ' > ' + e.node.space.name,
      parent_id: e.node.space.parent_membership.space.id,
    }));

    const returnList = [];
    for (const space of spaces) {
      returnList.push(space);
      for (const folder of folders) {
        if (folder.parent_id === space.id) {
          returnList.push(folder);
        }
      }
    }

    // Load 10 per page
    return returnList.slice(bundle.meta.page * 10, (bundle.meta.page + 1) * 10);
  });
};

export default {
  operation: {
    perform: perform,
    sample: { id: '1UsRFaZu9XgyTFej', name: 'Workspace' },
    outputFields: [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
    ],
    canPaginate: true,
  },
  key: 'get_all_spaces',
  noun: 'Workspace or Folder',
  display: {
    label: 'Get All Workspaces and Folders',
    description: "List all workspaces and folders from a user's account.",
    hidden: true,
    important: false,
  },
};
