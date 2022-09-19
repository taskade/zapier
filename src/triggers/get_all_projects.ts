import { Bundle, HttpRequestOptions, ZObject } from 'zapier-platform-core';

interface Document {
  id: string;
  info: {
    title: string | null | undefined;
    stats: {
      cleared: boolean;
      completed: boolean;
      completedCount: number;
      totalCount: number;
    };
    updatedBy?: {
      id: number;
      handle: string;
    } | null;
  };
}

interface DocumentEdge {
  cursor: string;
  node: Document | null | undefined;
}

const perform = async (z: ZObject, bundle: Bundle) => {
  const sharedWithMeRequest: HttpRequestOptions = {
    url: 'https://www.taskade.com/graphql',
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'content-type': 'application/json',
      authorization: `bearer ${bundle.authData.access_token}`,
    },
    body: {
      operationName: 'RecentProjectsQuery',
      variables: {
        filterby: { member: 'project-only' },
        first: 20,
        after: null,
      },
      query: `
      query RecentProjectsQuery($first: Int, $after: String, $filterby: RecentProjectsFiltering) {
      recentProjects(first: $first, after: $after, filterby: $filterby) {
        edges {
          cursor
          node {
            id
            info
          }
        }
      }
    }`,
    },
  };

  if (bundle.inputData.space_id == null || bundle.inputData.space_id === undefined) {
    return z.request('https://www.taskade.com/graphql', sharedWithMeRequest).then((response) => {
      const results = response.json;
      const projects = results.data.recentProjects.edges.map((e: DocumentEdge) => ({
        id: e.node?.id,
        title: e.node?.info.title,
      }));
      return [...projects];
    });
  } else {
    const options: HttpRequestOptions = {
      url: 'https://www.taskade.com/graphql',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'content-type': 'application/json',
        authorization: `bearer ${bundle.authData.access_token}`,
      },
      body: {
        operationName: 'SpaceDocuments',
        variables: {
          spaceID: bundle.inputData.space_id,
          filterby: { archived: false, templated: false },
          first: 20,
          after: bundle.meta.page !== 0 ? `${bundle.meta.page * 20}` : null,
          orderby: [
            { sort: 'pinned_at', direction: 'desc' },
            { sort: 'updated_at', direction: 'desc' },
          ],
        },
        query: `
        query SpaceDocuments(
          $spaceID: ID
          $orderby: [DocumentOrdering]
          $filterby: DocumentFiltering
          $first: Int
          $after: String
        ) {
          membership(space_id: $spaceID) {
            id
            space {
              id
              documents_v2(
                first: $first
                after: $after
                orderby: $orderby
                filterby: $filterby
              ) {
                edges {
                  node {
                    id
                    info
                  }
                }
              }
            }
          }
        }
      `,
      },
    };
    return z.request('https://www.taskade.com/graphql', options).then((response) => {
      response.throwForStatus();
      const results = response.json;

      // You can do any parsing you need for results here before returning them

      const projects = results.data.membership.space.documents_v2.edges.map((e: DocumentEdge) => ({
        id: e.node?.id,
        title: e.node?.info.title,
      }));
      return [...projects];
    });
  }
};

export default {
  operation: {
    perform: perform,
    inputFields: [
      {
        key: 'space_id',
        type: 'string',
        dynamic: 'get_all_spaces.id.name',
        label: 'Space ID',
        required: true,
        list: false,
        altersDynamicFields: false,
      },
    ],
    sample: { id: '8hoA5PtYfKroDifZ', title: 'Get Started with Taskade' },
    outputFields: [
      { key: 'id', label: 'ID' },
      { key: 'title', label: 'Title' },
    ],
    canPaginate: true,
  },
  key: 'get_all_projects',
  noun: 'Projects',
  display: {
    label: 'Get All Projects',
    description: "List all projects from a user's space.",
    hidden: true,
    important: false,
  },
};
