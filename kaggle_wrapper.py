import sys
import json
import os
from kaggle.api.kaggle_api_extended import KaggleApi

def setup_auth(creds):
    os.environ['KAGGLE_USERNAME'] = creds['username']
    os.environ['KAGGLE_KEY'] = creds['key']
    api = KaggleApi()
    api.authenticate()
    return api

def serialize_competition(comp):
    # Map Kaggle competition object to a dict
    deadline = getattr(comp, 'deadline', '')
    enabledDate = getattr(comp, 'enabledDate', '')
    
    return {
        'ref': getattr(comp, 'ref', ''),
        'title': getattr(comp, 'title', ''),
        'description': getattr(comp, 'description', ''),
        'url': getattr(comp, 'url', ''),
        'deadline': deadline.isoformat() if hasattr(deadline, 'isoformat') else str(deadline),
        'category': getattr(comp, 'category', ''),
        'reward': getattr(comp, 'reward', ''),
        'teamCount': getattr(comp, 'teamCount', 0),
        'userHasEntered': getattr(comp, 'userHasEntered', False),
        'enabledDate': enabledDate.isoformat() if hasattr(enabledDate, 'isoformat') else str(enabledDate),
    }

def serialize_dataset(ds):
    lastUpdated = getattr(ds, 'lastUpdated', '')
    return {
        'ref': getattr(ds, 'ref', ''),
        'title': getattr(ds, 'title', ''),
        'subtitle': getattr(ds, 'subtitle', ''),
        'url': getattr(ds, 'url', ''),
        'totalBytes': getattr(ds, 'totalBytes', 0),
        'usabilityRating': getattr(ds, 'usabilityRating', 0),
        'lastUpdated': lastUpdated.isoformat() if hasattr(lastUpdated, 'isoformat') else str(lastUpdated),
        'downloadCount': getattr(ds, 'downloadCount', 0),
        'voteCount': getattr(ds, 'voteCount', 0),
    }

def main():
    try:
        input_data = json.load(sys.stdin)
        command = input_data.get('command')
        creds = input_data.get('credentials')
        params = input_data.get('params', {})

        if not creds:
            print(json.dumps({'error': 'No credentials provided'}))
            return

        api = setup_auth(creds)

        if command == 'listCompetitions':
            # search is passed in params if present
            search = params.get('search')
            page = int(params.get('page', 1))
            sort_by = params.get('sortBy')
            comps = api.competitions_list(search=search, page=page, sort_by=sort_by)
            print(json.dumps([serialize_competition(c) for c in comps]))

        elif command == 'listDatasets':
            search = params.get('search')
            page = int(params.get('page', 1))
            sort_by = params.get('sortBy', 'votes')
            datasets = api.dataset_list(search=search, page=page, sort_by=sort_by)
            print(json.dumps([serialize_dataset(d) for d in datasets]))
            
        elif command == 'testAuth':
            # Just try to list competitions, limit 1
            api.competitions_list(page=1)
            print(json.dumps({'status': 'ok'}))

        else:
            print(json.dumps({'error': f'Unknown command: {command}'}))

    except Exception as e:
        print(json.dumps({'error': str(e)}))

if __name__ == '__main__':
    main()
