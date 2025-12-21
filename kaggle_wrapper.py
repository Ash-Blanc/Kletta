import sys
import json
import os
import tempfile
from kaggle.api.kaggle_api_extended import KaggleApi

def setup_auth(creds):
    # Create a temporary config directory to avoid conflicts with ~/.kaggle/kaggle.json
    temp_dir = tempfile.mkdtemp()
    
    # Manually create the kaggle.json file in the temp directory
    # This is the most reliable way to ensure the API uses these specific credentials
    config_file = os.path.join(temp_dir, 'kaggle.json')
    with open(config_file, 'w') as f:
        json.dump({
            "username": creds['username'].strip(),
            "key": creds['key'].strip()
        }, f)
    
    # Set permissions (required by Kaggle library on Linux/Mac)
    os.chmod(config_file, 0o600)
    
    os.environ['KAGGLE_CONFIG_DIR'] = temp_dir
    
    # Re-initialize API to ensure it picks up the new config directory
    api = KaggleApi()
    api.authenticate()
    return api

def serialize_competition(comp):
    # Map Kaggle competition object to a dict
    deadline = getattr(comp, 'deadline', '')
    enabledDate = getattr(comp, 'enabledDate', '')
    
    # Ensure URL is absolute
    url = getattr(comp, 'url', '')
    if url and not url.startswith('http'):
        url = f"https://www.kaggle.com{url}"
    elif not url and hasattr(comp, 'ref'):
        url = f"https://www.kaggle.com/c/{comp.ref}"

    return {
        'ref': getattr(comp, 'ref', ''),
        'title': getattr(comp, 'title', ''),
        'description': getattr(comp, 'description', ''),
        'url': url,
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

def serialize_leaderboard_entry(entry):
    return {
        'teamId': getattr(entry, 'teamId', ''),
        'teamName': getattr(entry, 'teamName', ''),
        'submissionId': getattr(entry, 'submissionId', ''),
        'score': getattr(entry, 'score', ''),
        'rank': getattr(entry, 'rank', 0),
    }

def serialize_kernel(kernel):
    return {
        'ref': getattr(kernel, 'ref', ''),
        'title': getattr(kernel, 'title', ''),
        'author': getattr(kernel, 'author', ''),
        'lastRunTime': str(getattr(kernel, 'lastRunTime', '')),
        'totalVotes': getattr(kernel, 'totalVotes', 0),
        'status': getattr(kernel, 'status', ''),
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
            
        elif command == 'getLeaderboard':
            id = params.get('id')
            if not id:
                print(json.dumps({'error': 'Competition ID required'}))
                return
            lb = api.competition_leaderboard_view(id)
            print(json.dumps([serialize_leaderboard_entry(e) for e in lb]))

        elif command == 'listDatasetFiles':
            id = params.get('id')
            if not id:
                print(json.dumps({'error': 'Dataset ID required'}))
                return
            files = api.dataset_list_files(id).files
            print(json.dumps([{'name': getattr(f, 'name', ''), 'size': getattr(f, 'size', '')} for f in files]))

        elif command == 'listKernels':
            search = params.get('search')
            mine = params.get('mine') == 'true'
            competition = params.get('competition')
            kernels = api.kernels_list(search=search, mine=mine, competition=competition)
            print(json.dumps([serialize_kernel(k) for k in kernels]))

        elif command == 'getKernelStatus':
            id = params.get('id')
            if not id:
                print(json.dumps({'error': 'Kernel ID required'}))
                return
            status = api.kernels_status(id)
            print(json.dumps({'status': getattr(status, 'status', 'unknown'), 'message': getattr(status, 'message', '')}))

        elif command == 'getKernelOutput':
            id = params.get('id')
            if not id:
                print(json.dumps({'error': 'Kernel ID required'}))
                return
            output = api.kernels_output(id)
            # Log typically contains stdout/stderr
            print(json.dumps({'log': getattr(output, 'log', '')}))

        elif command == 'testAuth':
            try:
                # Just try to list competitions, limit 1
                api.competitions_list(page=1)
                print(json.dumps({'status': 'ok'}))
            except Exception as e:
                # Re-raise to let the outer catch handle it with detailed message
                raise Exception(f"Kaggle API verification failed: {str(e)}")

        else:
            print(json.dumps({'error': f'Unknown command: {command}'}))

    except Exception as e:
        print(json.dumps({'error': str(e)}))

if __name__ == '__main__':
    main()
