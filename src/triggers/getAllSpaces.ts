import { Bundle, ZObject } from 'zapier-platform-core';

interface Folder {
  id: string;
  name: string;
}

interface FoldersResponseOk {
  ok: true;
  items: Folder[];
}

interface FoldersResponseError {
  ok: false;
  message: string;
}

type FoldersResponse = FoldersResponseOk | FoldersResponseError;

const perform = async (z: ZObject, bundle: Bundle) => {
  const response = await z.request({
    url: `https://www.taskade.com/api/v1/workspaces`,
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${bundle.authData.access_token}`,
    },
  });

  const spaceData: FoldersResponse = response.json;

  if (!spaceData.ok) {
    throw new z.errors.Error(spaceData.message, 'invalid_input', 400);
  }

  const currentPage = bundle.meta.page || 0;
  const spacePerPage = 5;
  const startIndex = currentPage * spacePerPage;
  const endIndex = startIndex + spacePerPage;

  const returnList = [];
  for (const space of spaceData.items.slice(startIndex, endIndex)) {
    const foldersResponse = await z.request({
      url: `https://www.taskade.com/api/v1/workspaces/${space.id}/folders`,
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${bundle.authData.access_token}`,
      },
    });

    const folderData: FoldersResponse = foldersResponse.json;

    if (!folderData.ok) {
      throw new z.errors.Error(folderData.message, 'invalid_input', 400);
    }

    for (const folder of folderData.items) {
      returnList.push({
        id: folder.id,
        name: `${space.name} > ${folder.name}`,
      });
    }
  }

  return returnList;
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
  },
};
