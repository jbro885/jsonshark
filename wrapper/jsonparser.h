#ifndef JSONPARSER_H
#define JSONPAESER_H

extern "C" {

#include <stdio.h>
#include <string.h>
#include <malloc.h>

//We use a json message to keep detailed information of each packet. Each json message is stored as a tree here, where each item (or tree node)
//correspondes to a line in the dissected output. This item may have a chld item that contains more detailed sub-information, or a next item that 
//contains next line of output at the same level.
typedef struct item;

//Function used to new an item
extern item *newItem();

//Function used to free a tree of items, given a root item 
extern void freeItems(item *i);

//Function used to add a next item, given the current item and the showName of the next item
extern void saveAsJsonString(item *root, FILE *detailTmp, FILE *indexTmp);

//Function used to add a next item, given the current item and the showName of the next item
extern item *addNextItem(item *i, char *s);

//Function used to add a chld item, given the current item and showName of the chld item
extern item *addChldItem(item *i, char *s);

//Function used to add an item in the tree, given the root of the tree and the level of the tree to be added
extern item *addParentItem(item *root, int indent, char *s);

//Function used to save a tree of the items into a file as a json string.
void saveItem(item *root, FILE *fp);

//Function used to save detailed packet information into a file and the according postions of each packet in the file into another file, so as to speed up searching 
extern void saveAsJsonString(item *root, FILE *detailTmp, FILE *indexTmp);

}

#endif
