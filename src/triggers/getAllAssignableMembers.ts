import { ApolloClient, createHttpLink, gql, InMemoryCache } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import isEmpty from 'lodash/isEmpty';
import uniqBy from 'lodash/uniqBy';
import { Bundle, ZObject } from 'zapier-platform-core';

interface User {
  id: string;
  handle: string;
  display_name: string;
}

interface Membership {
  id: string;
  user: User;
}

interface ProjectMember {
  id: string;
  user: User;
}

interface ProjectMemberEdge {
  cursor: string;
  node: ProjectMember | null | undefined;
}

const perform = async (z: ZObject, bundle: Bundle) => {
  const httpLink = createHttpLink({
    uri: 'https://www.taskade.com/graphql',
  });

  const authLink = setContext((_, { headers }) => {
    return {
      headers: {
        ...headers,
        authorization: bundle.authData.access_token ? `Bearer ${bundle.authData.access_token}` : '',
      },
    };
  });

  const client = new ApolloClient({
    name: 'zapier',
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
  });

  const result = await client.query({
    query: gql`
      query ProjectMentionablesQuery($projectId: ID!, $projectMembersLimit: Int = null) {
        document(id: $projectId) {
          id
          members(first: $projectMembersLimit) {
            edges {
              node {
                id
                user {
                  id
                  handle
                  display_name
                }
              }
            }
          }
          space {
            id
            memberships {
              id
              user {
                id
                handle
                display_name
              }
            }
          }
        }
      }
    `,
    variables: {
      projectId: bundle.inputData.project_id,
    },
  });

  const { data } = result;

  if (data == null) {
    return [];
  }

  const { space, members } = data.document;

  const results = [];

  const allSpaceMembers =
    space?.memberships?.map((member: Membership) => {
      return member.user ?? null;
    }) ?? [];

  const allDocumentMembers =
    members?.edges?.map((edge: ProjectMemberEdge) => {
      return edge.node?.user ?? null;
    }) ?? [];

  const allMembers = uniqBy(
    [...allSpaceMembers, ...allDocumentMembers],
    (member: User) => member?.id,
  );
  for (const member of allMembers) {
    if (member != null) {
      results.push({
        id: member.id,
        displayName: isEmpty(member.display_name) ? member.handle : member.display_name,
      });
    }
  }
  return results;
};

export default {
  operation: {
    perform: perform,
    inputFields: [
      {
        key: 'project_id',
        type: 'string',
        label: 'Project ID',
        dynamic: 'get_all_projects.id.title',
        required: true,
        list: false,
        altersDynamicFields: true,
      },
    ],
    sample: { id: '1', displayName: 'xiao ming' },
    outputFields: [
      { key: 'id', label: 'ID' },
      { key: 'displayName', label: 'Display Name' },
    ],
  },
  key: 'get_all_assignable_members',
  noun: 'Assignable Members',
  display: {
    label: 'Get All Assignable Members',
    description: 'List all assignable members from a project.',
    hidden: true,
    important: false,
  },
};
